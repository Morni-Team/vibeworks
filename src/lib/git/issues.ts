import type { Prisma, Task, TaskStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { tk } from "@/lib/i18n/messages";
import { nextTaskPosition, syncProjectProgress, transitionTask } from "@/lib/tasks";
import { recurrenceLabel } from "@/lib/taskDates";
import { priorityLabel } from "@/lib/status";
import { issuesPaused } from "./repoAreasLogic";
import { guessProvider, parseRepoUrl, type GitProvider, type ParsedRepo } from "./parse";
import { issueTokenFor, userIssueToken } from "./token";
import { runBotCommands } from "./botCommands";
import { BOT_MARKER, REPLY_MARKER } from "./botCommandsLogic";
import { importNewIssues, refreshImportedTasks } from "./issueImport";
import { taskIsAiLocked } from "@/lib/aiLock";
import { appLink, notifyUser } from "@/lib/notify";
import { GitError, issueApi, STATUS_LABELS, type IssueApi, type IssueComment, type IssueInput, type IssueRef, type StatusLabel } from "./providers";

// Aufgaben ↔ Issues. Jede Aufgabe eines Projekts mit Repository und Token
// bekommt ein Issue; Titel, Text und Status folgen der Aufgabe:
//   Offen → offen · In Arbeit → offen + „in Arbeit“ · Blockiert → offen +
//   „blockiert“ · Erledigt → geschlossen.
// Umgekehrt sortiert der Abgleich Issues, die im Git-System geändert wurden
// (Label gesetzt, per „Fixes #12“ geschlossen …), in die passende Spalte –
// maßgeblich ist, wer zuletzt geändert hat.

const BACKFILL_LIMIT = 25;

/** Unsichtbare Markierung im Issue-Text – so ist jedes Issue seiner Aufgabe zuzuordnen. */
const taskMarker = (taskId: string) => `<!-- vibeworks:task:${taskId} -->`;

export function issueBody(task: Pick<Task, "id" | "description" | "labels" | "dueDate" | "recurrence" | "assignee" | "createdByName" | "createdVia"> & { priority?: number }): string {
  const meta: string[] = [];
  // Veröffentlicht wird mit dem Token des Besitzers – wer die Aufgabe wirklich angelegt hat, steht deshalb hier
  if (task.createdVia === "auto") meta.push("✍️ Automatisch von VibeWorks angelegt");
  else if (task.createdByName) meta.push(`✍️ Erstellt von: ${task.createdByName} in VibeWorks${task.createdVia === "mcp" ? " (per KI über MCP)" : ""}`);
  if (task.priority && task.priority !== 2) meta.push(`${task.priority === 4 ? "🔥" : task.priority === 3 ? "⬆️" : "⬇️"} Priorität: ${priorityLabel(task.priority)}`);
  if (task.assignee) meta.push(`👤 Bearbeitet von: ${task.assignee}`);
  if (task.dueDate) meta.push(`📅 Fällig: ${task.dueDate.toISOString().slice(0, 10).split("-").reverse().join(".")}`);
  if (task.recurrence) meta.push(`🔁 ${recurrenceLabel(task.recurrence)}`);
  if (task.labels.length) meta.push(`🏷️ ${task.labels.join(", ")}`);
  return [
    task.description?.trim(),
    meta.join(" · "),
    "---",
    "_Aus VibeWorks gespiegelt – Änderungen bitte dort vornehmen._",
    "💬 Per Kommentar steuerbar: `/status erledigt` · `/prio 3` · `/übernehmen` · `/info` · `/hilfe`",
    taskMarker(task.id),
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Labels, die sagen, wer an einem Issue arbeitet: „🤖 Claude“, „👤 anna“. */
const WORKER_LABEL = /^(?:🤖|👤|Arbeiter|Bughunter)\s*/i;

/**
 * Arbeiter auch aus den Kommentaren lesen (#125): KI-Antworten über VibeWorks
 * sind mit „**Name** (über VibeWorks):“ unterschrieben und enden auf dem
 * Antwort-Marker, Bot-Befehle melden den Bot selbst – der Kommentar-Text bleibt
 * immer außen vor, damit kein Name aus dem Inhalt erfunden wird.
 */
const WORKER_SIGNATURE = /^\*\*(\S[^*]{0,60}?)\*\* \(über VibeWorks\):/;

/** Bearbeiter laut Issue: Bearbeiter-Labels, Zuweisungen und kommentierende KI-/Bot-Arbeiter, ohne Doppelte. */
export function workersFromIssue(issue: Pick<IssueRef, "labels" | "assignees"> & { comments?: IssueComment[] }): string[] {
  const fromLabels = issue.labels.filter((l) => WORKER_LABEL.test(l.trim())).map((l) => l.trim().replace(WORKER_LABEL, "").trim());
  const fromComments = (issue.comments ?? [])
    .filter((c) => c.body.includes(REPLY_MARKER) || c.body.includes(BOT_MARKER))
    .map((c) => WORKER_SIGNATURE.exec(c.body)?.[1]?.trim() ?? (c.body.includes(BOT_MARKER) ? c.author : null))
    .filter((n): n is string => Boolean(n));
  return [...new Set([...fromLabels, ...issue.assignees.map((a) => `@${a}`), ...fromComments])].filter(Boolean).slice(0, 10);
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function labelForStatus(status: TaskStatus): StatusLabel | null {
  return status === "DOING" ? STATUS_LABELS.DOING : status === "BLOCKED" ? STATUS_LABELS.BLOCKED : null;
}

function statusFromIssue(issue: Pick<IssueRef, "closed" | "labels">): TaskStatus {
  if (issue.closed) return "DONE";
  const labels = issue.labels.map((l) => l.toLowerCase());
  if (labels.includes(STATUS_LABELS.BLOCKED.toLowerCase())) return "BLOCKED";
  if (labels.includes(STATUS_LABELS.DOING.toLowerCase())) return "DOING";
  return "TODO";
}

// Liefert einen Übersetzungsschlüssel – er landet in Task.issueError und wird beim Anzeigen übersetzt.
function describe(err: unknown): string {
  if (err instanceof GitError) {
    if (err.status === 403) return tk("git", "errors.issueForbidden");
    if (err.status === 404) return tk("git", "errors.issueNotFound");
    return err.message;
  }
  return tk("git", "errors.issueFailed");
}

export interface IssueContext {
  api: IssueApi;
  provider: GitProvider;
  projectId: string;
  /** So heißt der Bot beim Anbieter – null ohne Bot */
  botLogin: string | null;
  /** Schreibt über einen Bot statt über das Konto des Besitzers */
  viaBot: boolean;
  /** Bot als GitHub App eingerichtet, aber NICHT in diesem Repository installiert (#136-Recherche):
   *  Kommentare laufen dann unter dem Konto des Besitzers – die Oberfläche zeigt den Installations-Link. */
  botInstallUrl: string | null;
  ownerId: string;
  repoUrl: string;
  parsed: ParsedRepo;
}

const isIssuesDisabled = (err: unknown) => err instanceof GitError && err.status === 410;

/**
 * Das Repository hat Issues abgeschaltet: merken, einen Tag Ruhe geben und
 * die Fehlermarken an den Aufgaben entfernen – das ist eine Einschränkung,
 * kein kaputtes Repository (#66).
 */
async function markIssuesOff(projectId: string): Promise<void> {
  await db.project.updateMany({ where: { id: projectId }, data: { issuesOffAt: new Date() } });
  await db.$executeRaw`UPDATE "Task" SET "issueError" = NULL WHERE "projectId" = ${projectId} AND "issueError" IS NOT NULL`;
}

/** Null, wenn das Projekt keine Issues spiegelt (kein Repository, kein Token, abgeschaltet). */
export async function issueContext(projectId: string): Promise<IssueContext | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, repoUrl: true, repoTokenCipher: true, issueSync: true, issuesOffAt: true, repoCache: { select: { provider: true } } },
  });
  if (!project?.repoUrl || !project.issueSync) return null;
  // Issues im Repository abgeschaltet: einen Tag lang nicht nachfragen – spart API-Aufrufe (#66)
  if (issuesPaused(project.issuesOffAt)) return null;
  const stored = await issueTokenFor(project); // Bot, sonst Projekt- oder Konto-Token
  if (!stored) return null;
  const parsed = parseRepoUrl(project.repoUrl);
  const provider = (project.repoCache?.provider || guessProvider(parsed?.host ?? "")) as GitProvider | "";
  if (!parsed || !provider || provider === "git") return null; // Anbieter erst nach dem ersten Abgleich bekannt; beliebige Git-Server kennen keine Issues
  return {
    api: issueApi(provider, parsed, stored.token),
    provider,
    projectId,
    botLogin: stored.botLogin,
    viaBot: stored.source === "bot",
    botInstallUrl: stored.botInstallUrl,
    ownerId: project.ownerId,
    repoUrl: project.repoUrl,
    parsed,
  };
}

/** Gesperrte Aufgaben (#76): Das Issue verrät weder Titel noch Text – die KI liest auch GitHub. */
const LOCKED_TITLE = "🔒 Für KI gesperrte Aufgabe";
const lockedBody = (task: Task) => ["🔒 Diese Aufgabe ist in VibeWorks für KI gesperrt – Inhalt nur dort sichtbar.", "---", "_Aus VibeWorks gespiegelt – Änderungen bitte dort vornehmen._", taskMarker(task.id)].join("\n\n");

/**
 * Wer legt das Issue an? (#76) Aufgaben des Besitzers und automatische über den
 * Projekt-Zugang; Aufgaben anderer über deren eigenen Git-Zugang oder den Bot –
 * nie unter dem Namen des Besitzers. null: kein erlaubter Weg.
 */
async function creatorApi(task: Task, ctx: IssueContext): Promise<IssueApi | null> {
  if (!task.createdById || task.createdById === ctx.ownerId || task.createdVia === "auto") return ctx.api;
  const own = await userIssueToken(task.createdById, ctx.repoUrl);
  if (own) return issueApi(ctx.provider, ctx.parsed, own);
  return ctx.viaBot ? ctx.api : null;
}

const issueInput = (task: Task, reason?: IssueInput["reason"], locked = false): IssueInput => ({
  title: locked ? LOCKED_TITLE : task.title,
  body: locked ? lockedBody(task) : issueBody(task),
  closed: task.status === "DONE" || reason === "not_planned",
  reason: reason ?? (task.status === "DONE" ? "completed" : undefined),
});

// Ein Prozess, eine Warteschlange je Aufgabe: Anlegen nach dem Speichern und
// ein gleichzeitiger Abgleich dürfen nicht zwei Issues für dieselbe Aufgabe
// erzeugen.
const taskLocks = new Map<string, Promise<unknown>>();
function withTaskLock<T>(taskId: string, fn: () => Promise<T>): Promise<T> {
  const prev = taskLocks.get(taskId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => undefined);
  taskLocks.set(taskId, tail);
  void tail.then(() => {
    if (taskLocks.get(taskId) === tail) taskLocks.delete(taskId);
  });
  return run;
}

/** Legt das Issue einer Aufgabe an oder bringt es auf ihren Stand. Wirft nie. */
export interface PushTaskIssueResult { disabled?: boolean; created?: boolean; error?: string | null; }
export function pushTaskIssue(taskId: string, ctx?: IssueContext | null): Promise<PushTaskIssueResult | void> {
  return withTaskLock(taskId, async () => {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) return;
    ctx ??= await issueContext(task.projectId);
    if (!ctx) return;
    const locked = await taskIsAiLocked(task);
    // Neue gesperrte Aufgaben bekommen gar kein Issue; bestehende werden unkenntlich
    if (locked && !task.issueNumber) return;
    const createWith = task.issueNumber ? null : await creatorApi(task, ctx);
    if (!task.issueNumber && !createWith) {
      if (task.issueError !== tk("git", "errors.issueNeedsAccount")) { await db.$executeRaw`UPDATE "Task" SET "issueError" = ${tk("git", "errors.issueNeedsAccount")} WHERE "id" = ${task.id}`; return { error: tk("git", "errors.issueNeedsAccount") }; }
      return;
    }
    try {
      const input = issueInput(task, undefined, locked);
      // Aus dem Git-System übernommen (#69): nur Status und Labels abgleichen
      if (task.createdVia === "issue") {
        delete input.title;
        delete input.body;
      }
      const ref = task.issueNumber ? await ctx.api.update(task.issueNumber, input) : await createWith!.create(issueInput(task));
      // Sofort merken – falls das Label danach scheitert, entsteht kein zweites Issue.
      await db.$executeRaw`UPDATE "Task" SET "issueNumber" = ${ref.number}, "issueUrl" = ${ref.url}, "issueError" = NULL WHERE "id" = ${task.id}`;
      await ctx.api.setStatusLabel(ref, task.status === "DONE" ? null : labelForStatus(task.status));
      return { created: !task.issueNumber };
    } catch (err) {
      if (isIssuesDisabled(err)) {
        await markIssuesOff(task.projectId);
        return { disabled: true };
      }
      await db.$executeRaw`UPDATE "Task" SET "issueError" = ${describe(err)} WHERE "id" = ${task.id}`;
      return { error: describe(err) };
    }
  });
}

export async function pushTaskIssues(taskIds: string[]): Promise<void> {
  if (!taskIds.length) return;
  const first = await db.task.findUnique({ where: { id: taskIds[0] }, select: { projectId: true } });
  const ctx = first && (await issueContext(first.projectId));
  if (!ctx) return;
  for (const id of taskIds) await pushTaskIssue(id, ctx);
}

/** Gelöschte Aufgabe: Issue als „nicht geplant“ schließen statt es stehen zu lassen. */
export async function closeIssueOfDeletedTask(projectId: string, task: Task): Promise<void> {
  if (!task.issueNumber) return;
  const ctx = await issueContext(projectId);
  if (!ctx) return;
  await ctx.api.update(task.issueNumber, issueInput(task, "not_planned")).catch(() => undefined);
}

export interface IssueSyncResult {
  created: number;
  tasksChanged: number;
  linked: number;
  /** Aufgaben, die Bot-Befehle geändert haben */
  commands: number;
  /** Aus dem Git-System übernommene Issues */
  imported: number;
  error: string | null;
}

const running = new Map<string, Promise<IssueSyncResult | null>>();

/**
 * Voller Abgleich: offene Aufgaben ohne Issue nachtragen (höchstens 25 pro
 * Lauf) und im Git-System geänderte Issues in die passende Spalte sortieren.
 * Läuft je Projekt nur einmal gleichzeitig.
 */
export function syncIssues(projectId: string): Promise<IssueSyncResult | null> {
  const active = running.get(projectId);
  if (active) return active;
  const job = runSync(projectId).finally(() => running.delete(projectId));
  running.set(projectId, job);
  return job;
}

async function runSync(projectId: string): Promise<IssueSyncResult | null> {
  const ctx = await issueContext(projectId);
  if (!ctx) return null;
  const result: IssueSyncResult = { created: 0, tasksChanged: 0, linked: 0, commands: 0, imported: 0, error: null };

  // Aufgaben ohne erlaubten Weg (#76) nicht vorne festhängen lassen – nur ein paar je Lauf erneut versuchen
  const needsAccount = tk("git", "errors.issueNeedsAccount");
  const pick = (where: Prisma.TaskWhereInput, take: number) =>
    db.task.findMany({ where: { projectId, issueNumber: null, status: { not: "DONE" }, ...where }, orderBy: { createdAt: "asc" }, take, select: { id: true } });
  const missing = [...(await pick({ OR: [{ issueError: null }, { issueError: { not: needsAccount } }] }, BACKFILL_LIMIT)), ...(await pick({ issueError: needsAccount }, 5))];
  for (const { id } of missing) {
    const pushResult = await pushTaskIssue(id, ctx);
    if (pushResult?.disabled) return null;
    if (pushResult?.created) result.created++;
    else if (pushResult?.error && pushResult.error !== needsAccount) {
      result.error = pushResult.error;
      break; // Meist ein Rechteproblem – nicht 25-mal dasselbe versuchen
    }
  }

  try {
    const recent = await ctx.api.recent();
    // Wieder erreichbar: Pause aufheben
    await db.project.updateMany({ where: { id: projectId, issuesOffAt: { not: null } }, data: { issuesOffAt: null } });
    const byNumber = new Map(recent.map((i) => [i.number, i]));
    const linked = await db.task.findMany({ where: { projectId, issueNumber: { in: [...byNumber.keys()] } } });
    const closedViaGit: string[] = [];
    for (const task of linked) {
      const issue = byNumber.get(task.issueNumber!)!;
      // Bearbeiter laut Issue – ohne updatedAt anzufassen, das entscheidet über die Richtung des Statusabgleichs.
      // Kommentare nur nachlesen, wenn die Labels niemanden verraten – so bleibt die API-Last klein (#125).
      const comments = workersFromIssue(issue).length || !issue.updatedAt ? undefined : await ctx.api.comments(task.issueNumber!).catch(() => undefined);
      const workers = workersFromIssue({ ...issue, comments });
      if (!sameList(workers, task.issueAssignees)) await db.$executeRaw`UPDATE "Task" SET "issueAssignees" = ${workers}::text[] WHERE "id" = ${task.id}`;
      const target = statusFromIssue(issue);
      if (target === task.status) continue;
      // Nur übernehmen, wenn das Issue nach der Aufgabe geändert wurde –
      // sonst ist unsere eigene Änderung dort nur noch nicht angekommen.
      if (new Date(issue.updatedAt) <= task.updatedAt) continue;
      const position = await nextTaskPosition(db, projectId, target);
      await db.$transaction((tx) => transitionTask(tx, task, target, null, { position }));
      result.tasksChanged++;
      if (target === "DONE") closedViaGit.push(`#${task.issueNumber} ${task.title}`);
    }
    if (result.tasksChanged) await syncProjectProgress(projectId);
    if (closedViaGit.length) void notifyClosed(projectId, closedViaGit);
    // Befehle an den Bot aus neuen Kommentaren (#79, #81)
    const commanded = await runBotCommands(projectId, ctx.api, ctx.botLogin);
    for (const id of commanded) await pushTaskIssue(id, ctx);
    result.commands = commanded.length;
    // Neue Issues aus dem Git-System als Aufgaben (#69)
    result.imported = await importNewIssues(projectId, ctx.api, recent, ctx.botLogin);
    // Schon übernommene: Titel, Text und Labels aus dem Issue nachziehen (#109)
    result.tasksChanged += await refreshImportedTasks(projectId, recent);
  } catch (err) {
    if (isIssuesDisabled(err)) {
      await markIssuesOff(projectId);
      return null;
    }
    result.error ??= describe(err);
  }
  result.linked = await db.task.count({ where: { projectId, issueNumber: { not: null } } });
  return result;
}

/** Besitzer benachrichtigen: Aufgaben wurden im Git-System erledigt (Issue geschlossen). */
async function notifyClosed(projectId: string, titles: string[]): Promise<void> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { ownerId: true, name: true } });
  if (!project) return;
  await notifyUser(project.ownerId, "issueClosed", (t) => ({
    event: "issueClosed",
    title: t("events.issueClosed.title", { n: titles.length }),
    message: t("events.issueClosed.message", { project: project.name, list: titles.slice(0, 10).map((x) => `• ${x}`).join("\n") }),
    url: appLink(`/projects/${projectId}`),
  }));
}
