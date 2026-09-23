import { Prisma, type RepoCache } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tk } from "@/lib/i18n/messages";
import { appLink, notifyUser } from "@/lib/notify";
import { GitError } from "./providers";
import { normalizeCheckBranch } from "./repoCheckBranch";
import { artifactJson, deleteRepoFile, dispatchWorkflow, githubTarget, installError, latestWorkflowRun, readRepoFile, writeRepoFile, type GhTarget } from "./githubActions";
import { REPO_CHECK_ARTIFACT, REPO_CHECK_FILE, REPO_CHECK_PATH, REPO_CHECK_WORKFLOW } from "./repoCheckWorkflow";
import { checkGotWorse, parseCheckReport, reportIsStale, type CheckReport } from "./repoCheckLogic";
import { applyCheckIgnore, parseCheckIgnore } from "./checkIgnoreLogic";
import { syncCheckTasks } from "./checkTasks";

// Repo-Check über GitHub Actions: VibeWorks legt den Workflow selbst ins
// Repository (danach aktualisiert es nur die eigene, unveränderte Datei),
// fragt den jüngsten Lauf ab und holt den Bericht aus dem Artefakt. Wer die
// Datei im Repository löscht, schaltet den Check für das Projekt ab.
// Die Ergebnisse sehen nur Projektmitglieder – serializeRepoCache (auch für
// öffentliche Seiten) enthält sie bewusst nicht.

const DAY = 86_400_000;
/** Ist der letzte Lauf abgeschlossen, reicht ein Blick alle 30 Minuten. */
const POLL_MS = 30 * 60_000;
const MAX_ARTIFACT = 5 * 1024 * 1024;
const REPORT_FILE = "vibeworks-check.json";
/** Projekt-Ausnahmen im geprüften Repository (#197) – freiwillig, darf fehlen. */
const CHECK_IGNORE_PATH = ".vibeworks-check.json";
/** Erste Zeile der Vorlage – nur Dateien mit dieser Zeile aktualisiert oder entfernt VibeWorks. */
const MARKER = REPO_CHECK_WORKFLOW.split("\n")[0];

type CheckStatus = "waiting" | "running" | "done" | "failed" | "noPermission";
/** Mit diesen Zuständen war die Datei schon einmal erfolgreich eingerichtet. */
const INSTALLED = new Set(["waiting", "running", "done", "failed"]);

const CLEARED = {
  checkStatus: null,
  checkReport: Prisma.DbNull,
  checkRunUrl: null,
  checkRunAt: null,
  checkFetchedAt: null,
  checkError: null,
  checkInstalledAt: null,
} satisfies Prisma.RepoCacheUpdateManyMutationInput;

async function context(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      repoUrl: true,
      repoTokenCipher: true,
      repoCheck: true,
      checkBranch: true,
      checkTasks: true,
      repoCache: { select: { provider: true, defaultBranch: true, checkStatus: true, checkReport: true, checkRunUrl: true, checkFetchedAt: true, checkInstalledAt: true } },
    },
  });
  const cache = project?.repoCache;
  if (!project || !cache) return null;
  // Zweig für den Repo-Check (#125): leer/null heißt Standardzweig
  // Einrichten und Artefakte laden geht nur mit Token
  const target = await githubTarget(project, normalizeCheckBranch(project.checkBranch));
  return target ? { project, cache, target } : null;
}
type Ctx = NonNullable<Awaited<ReturnType<typeof context>>>;

const readWorkflow = (t: GhTarget) => readRepoFile(t, REPO_CHECK_PATH);

/**
 * Workflow-Datei anlegen oder auf den Stand der Vorlage bringen. Eine selbst
 * angepasste Datei (ohne VibeWorks-Kopfzeile) bleibt, wie sie ist.
 */
async function ensureWorkflow(ctx: Ctx): Promise<"created" | "updated" | "current" | "custom" | "removed"> {
  const current = await readWorkflow(ctx.target);
  if (!current) {
    if (ctx.cache.checkInstalledAt && INSTALLED.has(ctx.cache.checkStatus ?? "")) return "removed";
  } else if (current.text === REPO_CHECK_WORKFLOW) {
    return "current";
  } else if (!current.text.startsWith(MARKER)) {
    return "custom";
  }
  await writeRepoFile(ctx.target, REPO_CHECK_PATH, REPO_CHECK_WORKFLOW, current ? "VibeWorks: Repo-Check aktualisieren" : "VibeWorks: Repo-Check einrichten", current?.sha);
  return current ? "updated" : "created";
}

async function downloadReport(ctx: Ctx, runId: number): Promise<CheckReport> {
  const raw = await artifactJson(ctx.target, runId, REPO_CHECK_ARTIFACT, REPORT_FILE, MAX_ARTIFACT);
  let report: CheckReport;
  try {
    report = parseCheckReport(raw);
  } catch {
    throw new GitError(tk("check", "errors.badReport"));
  }
  // Projekt-Ausnahmen (#197): Was das Repository in .vibeworks-check.json als
  // „hier kein Problem“ erklärt, fällt raus – Geheimnisse bleiben immer stehen.
  const ignoreFile = await readRepoFile(ctx.target, CHECK_IGNORE_PATH).catch(() => null);
  return applyCheckIgnore(report, parseCheckIgnore(ignoreFile?.text ?? null));
}

async function run(projectId: string, force: boolean): Promise<void> {
  const ctx = await context(projectId);
  if (!ctx?.project.repoCheck) return;
  const { cache } = ctx;
  const now = new Date();
  const save = (data: Prisma.RepoCacheUpdateInput) => db.repoCache.update({ where: { projectId }, data });

  // 1. Workflow-Datei – einmal am Tag nachsehen, ob sie da und aktuell ist
  let status = cache.checkStatus;
  if (force || !cache.checkInstalledAt || now.getTime() - cache.checkInstalledAt.getTime() > DAY) {
    try {
      const result = await ensureWorkflow(ctx);
      if (result === "removed") {
        await db.project.update({ where: { id: projectId }, data: { repoCheck: false } });
        await save(CLEARED);
        return;
      }
      if (result === "created" || result === "updated" || !status || status === "noPermission") status = "waiting";
      await save({ checkInstalledAt: now, checkStatus: status, checkError: null });
    } catch (err) {
      const e = installError(err);
      await save({ checkInstalledAt: now, checkError: e.error, ...(e.status ? { checkStatus: e.status } : {}) });
      return;
    }
  }
  if (status === "noPermission") return;

  // 2. Jüngster Lauf – solange er aussteht bei jedem Abgleich, danach alle 30 Minuten
  const settled = status === "done" || status === "failed";
  if (!force && settled && cache.checkFetchedAt && now.getTime() - cache.checkFetchedAt.getTime() < POLL_MS) return;
  try {
    const latest = await latestWorkflowRun(ctx.target, REPO_CHECK_FILE);
    if (!latest) {
      await save({ checkFetchedAt: now, checkStatus: "waiting" });
      return;
    }
    if (latest.status !== "completed") {
      await save({ checkFetchedAt: now, checkStatus: "running", checkRunUrl: latest.html_url });
      return;
    }
    const runAt = new Date(latest.updated_at);
    if (latest.conclusion !== "success") {
      await save({ checkFetchedAt: now, checkStatus: "failed", checkRunUrl: latest.html_url, checkRunAt: runAt, checkError: tk("check", "errors.runFailed", { conclusion: latest.conclusion ?? "?" }) });
      return;
    }
    if (status === "done" && cache.checkRunUrl === latest.html_url && cache.checkReport) {
      await save({ checkFetchedAt: now });
      return;
    }
    const report = await downloadReport(ctx, latest.id);
    await save({ checkFetchedAt: now, checkStatus: "done", checkRunUrl: latest.html_url, checkRunAt: runAt, checkReport: report as unknown as Prisma.InputJsonValue, checkError: null });
    const before = cache.checkReport ? parseCheckReport(cache.checkReport) : null;
    if (checkGotWorse(before, report)) void notifyCheckAlert(ctx.project, report).catch((err) => console.error("[repo-check]", projectId, err));
    if (ctx.project.checkTasks !== "off") await syncCheckTasks(projectId, report).catch((err) => console.error("[check-tasks]", projectId, err));
  } catch (err) {
    await save({ checkFetchedAt: now, checkError: err instanceof GitError ? err.message : tk("git", "errors.unreachable") });
  }
}

const running = new Map<string, Promise<void>>();

/** Beim Git-Abgleich: einrichten, Lauf abfragen, Bericht holen – je Projekt nur einmal gleichzeitig. */
export function refreshRepoCheck(projectId: string, force = false): Promise<void> {
  const active = running.get(projectId);
  if (active) return active;
  const job = run(projectId, force).finally(() => running.delete(projectId));
  running.set(projectId, job);
  return job;
}

/** „Jetzt prüfen“: Datei sicherstellen und einen Lauf anstoßen. Wirft GitError. */
export async function startRepoCheck(projectId: string): Promise<void> {
  const ctx = await context(projectId);
  if (!ctx) throw new GitError(tk("check", "errors.needToken"));
  if (!ctx.project.repoCheck) throw new GitError(tk("check", "errors.off"));
  await refreshRepoCheck(projectId, true);
  const fresh = await db.repoCache.findUnique({ where: { projectId }, select: { checkStatus: true, checkError: true } });
  if (fresh?.checkStatus === "noPermission") throw new GitError(fresh.checkError ?? tk("check", "errors.noPermission"));
  if (fresh?.checkStatus === "running") return;
  await dispatchWorkflow(ctx.target, REPO_CHECK_FILE);
  await db.repoCache.update({ where: { projectId }, data: { checkStatus: "waiting", checkFetchedAt: new Date(), checkError: null } });
}

/**
 * Ein- oder ausschalten. Aus: die eigene Datei wieder aus dem Repository
 * nehmen (eine selbst angepasste bleibt). Liefert, ob entfernt wurde, und
 * einen Fehlerschlüssel, falls das nicht ging.
 */
export async function setRepoCheck(projectId: string, enabled: boolean): Promise<{ removed: boolean; error: string | null }> {
  await db.project.update({ where: { id: projectId }, data: { repoCheck: enabled } });
  await db.repoCache.updateMany({ where: { projectId }, data: CLEARED });
  if (enabled) {
    void refreshRepoCheck(projectId, true).catch((err) => console.error("[repo-check]", projectId, err));
    return { removed: false, error: null };
  }
  const ctx = await context(projectId);
  if (!ctx) return { removed: false, error: null };
  try {
    const current = await readWorkflow(ctx.target);
    if (!current?.text.startsWith(MARKER)) return { removed: false, error: null };
    await deleteRepoFile(ctx.target, REPO_CHECK_PATH, current.sha, "VibeWorks: Repo-Check entfernen");
    return { removed: true, error: null };
  } catch (err) {
    return { removed: false, error: installError(err).error };
  }
}

async function notifyCheckAlert(project: { id: string; name: string; ownerId: string }, report: CheckReport): Promise<void> {
  await notifyUser(project.ownerId, "checkAlert", (t) => ({
    event: "checkAlert",
    title: t("events.checkAlert.title", { project: project.name }),
    message: t("events.checkAlert.message", { secrets: report.counts.secrets, vulns: report.counts.vulnerabilities }),
    url: appLink(`/projects/${project.id}#repo-check`),
    // Ein Geheimnis im Repository ist kritisch, Sicherheitslücken „nur“ dringend
    priority: report.counts.secrets > 0 ? "urgent" : "high",
  }));
}

type CheckFields = Pick<RepoCache, "webUrl" | "defaultBranch" | "checkStatus" | "checkReport" | "checkRunUrl" | "checkRunAt" | "checkFetchedAt" | "checkError" | "commits">;

/** Zuletzt bekannter Commit aus dem Abgleich – für „ist der Bericht noch aktuell?“ (#148) */
function headCommit(c: CheckFields | null): string | null {
  const first = Array.isArray(c?.commits) ? (c.commits[0] as { sha?: unknown } | undefined) : undefined;
  return typeof first?.sha === "string" ? first.sha : null;
}

/**
 * Nur für angemeldete Projektmitglieder – nie für öffentliche Seiten.
 * branch ist der gewählte Zweig für den Check (#125, null heißt Standardzweig),
 * defaultBranch der Standard des Repositories – beides braucht die Oberfläche.
 */
export function serializeRepoCheck(enabled: boolean, c: CheckFields | null, autoTasks = "off", checkBranch: unknown = null) {
  const report = c?.checkReport ? parseCheckReport(c.checkReport) : null;
  return {
    enabled,
    autoTasks,
    branch: normalizeCheckBranch(checkBranch),
    status: (c?.checkStatus ?? null) as CheckStatus | null,
    report,
    /** Bericht gehört zu einem älteren Commit als dem zuletzt bekannten (#148) */
    stale: reportIsStale(report?.commit, headCommit(c)),
    runUrl: c?.checkRunUrl ?? null,
    runAt: c?.checkRunAt?.toISOString() ?? null,
    fetchedAt: c?.checkFetchedAt?.toISOString() ?? null,
    error: c?.checkError ?? null,
    webUrl: c?.webUrl ?? "",
    defaultBranch: c?.defaultBranch ?? null,
  };
}
export type RepoCheckView = ReturnType<typeof serializeRepoCheck>;
