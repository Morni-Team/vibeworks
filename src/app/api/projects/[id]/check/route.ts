import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, json, readBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guard";
import { requireProject } from "@/lib/access";
import { createTask } from "@/lib/actions";
import { getT } from "@/lib/i18n/server";
import { tk } from "@/lib/i18n/messages";
import { GitError } from "@/lib/git/providers";
import { refreshRepoCheck, serializeRepoCheck, setRepoCheck, startRepoCheck } from "@/lib/git/repoCheck";
import { checkBranchError, normalizeCheckBranch } from "@/lib/git/repoCheckBranch";
import { syncCheckTasks } from "@/lib/git/checkTasks";
import { applyDismissed, dismissKey, dismissTarget, MAX_DISMISSED } from "@/lib/git/checkIgnoreLogic";
import { CHECK_KINDS, CHECK_TASK_MODES, checkItems } from "@/lib/git/checkTasksLogic";
import { parseCheckReport } from "@/lib/git/repoCheckLogic";
import { taskCreateSchema } from "@/lib/validation";
import { limitOrThrow, MINUTE } from "@/lib/security/rateLimit";

type Params = { id: string };

const bodySchema = z.union([
  z.object({ action: z.enum(["run", "refresh", "enable", "disable"]) }),
  // Ein Befund als Aufgabe (#47) – Text und Stelle kommen aus dem gespeicherten Bericht, nicht vom Browser
  z.object({ action: z.enum(["task", "draft"]), kind: z.enum(CHECK_KINDS), index: z.number().int().min(0).max(5000) }),
  // Automatische Aufgaben: aus · nur Dringendes · alles – nur der Besitzer
  z.object({ action: z.literal("autoTasks"), mode: z.enum(CHECK_TASK_MODES) }),
  // Zweig für den Repo-Check (#125) – nur der Besitzer; null heißt Standardzweig
  z.object({ action: z.literal("setBranch"), branch: z.string().max(200).nullable() }),
  // Fehlalarm abhaken oder zurückholen (#203) – die Stelle kommt aus dem gespeicherten Bericht
  z.object({ action: z.enum(["dismiss", "undismiss"]), kind: z.enum(CHECK_KINDS), index: z.number().int().min(0).max(5000) }),
  z.object({ action: z.literal("undismissAll") }),
]);

// Repo-Check eines Projekts. Die Ergebnisse sehen nur Projektmitglieder;
// öffentliche Seiten bekommen sie nie (siehe serializeRepoCache).
async function view(projectId: string) {
  const [project, cache] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { repoCheck: true, checkBranch: true, checkTasks: true } }),
    db.repoCache.findUnique({ where: { projectId } }),
  ]);
  return serializeRepoCheck(project?.repoCheck ?? false, cache, project?.checkTasks ?? "off", project?.checkBranch);
}

export const GET = route<Params>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { project } = await requireProject(user.id, (await params).id);
  return json({ check: await view(project.id) });
});

// run: jetzt prüfen · refresh: Stand bei GitHub abfragen (Mitglieder mit Schreibrecht)
// enable/disable: nur der Besitzer – „aus“ nimmt die Datei wieder aus dem Repository.
// task: Befund als Aufgabe (Aufgaben-Recht) · autoTasks: Einstellung (Besitzer)
export const POST = route<Params>(async (req, { params }) => {
  const user = await requireApiUser();
  const { id } = await params;
  const body = await readBody(req, bodySchema, { maxBytes: 1024 });
  const need = body.action === "enable" || body.action === "disable" || body.action === "autoTasks" || body.action === "setBranch" ? "OWNER" : body.action === "task" || body.action === "draft" ? "tasks.edit" : "git.sync";
  const { project } = await requireProject(user.id, id, need);
  if (!project.repoUrl) throw new ApiError(400, tk("check", "errors.noRepo"));

  let removed = false;
  let warning: string | null = null;
  let task: { id: string; title: string } | null = null;
  let draft: Record<string, unknown> | null = null;
  if (body.action === "task" || body.action === "draft") {
    limitOrThrow(`repo-check-task:${user.id}`, 30, 10 * MINUTE);
    const cache = await db.repoCache.findUnique({ where: { projectId: id }, select: { checkReport: true } });
    const item = cache?.checkReport ? checkItems(parseCheckReport(cache.checkReport), body.kind)[body.index] : undefined;
    if (!item) throw new ApiError(404, tk("check", "errors.noFinding"));
    const t = await getT("check");
    const title = t(`tasks.single.${body.kind}`, item.vars).slice(0, 200);
    const description = `${t(`explain.${body.kind}.prompt`, item.vars)}\n\n_${t("tasks.footer")}_`;
    const labels = body.kind === "findings" ? [t("tasks.label")] : [t("tasks.labelSecurity"), t("tasks.label")];
    const priority = body.kind === "findings" ? 3 : 4;
    // Schon offen? Dann nicht doppelt anlegen.
    const open = await db.task.findFirst({ where: { projectId: id, title, status: { not: "DONE" } }, select: { id: true, title: true } });
    if (body.action === "draft") {
      // Fürs Aufgaben-Fenster (#60): vorausgefüllt, angelegt wird erst beim Speichern
      draft = { title, description, labels, priority, assignee: "", existing: open };
    } else if (open) {
      task = open;
    } else {
      const input = taskCreateSchema.parse({ title, description, labels, priority });
      ({ task } = await createTask(user.id, id, input));
    }
  } else if (body.action === "autoTasks") {
    await db.project.update({ where: { id }, data: { checkTasks: body.mode } });
    const cache = await db.repoCache.findUnique({ where: { projectId: id }, select: { checkReport: true } });
    if (cache?.checkReport && body.mode !== "off") await syncCheckTasks(id, parseCheckReport(cache.checkReport));
  } else if (body.action === "dismiss" || body.action === "undismiss") {
    // Fehlalarm abhaken (#203): gespeichert wird Regel plus Fundstelle, nicht der Platz in der Liste
    limitOrThrow(`repo-check-dismiss:${user.id}`, 120, 10 * MINUTE);
    const cache = await db.repoCache.findUnique({ where: { projectId: id }, select: { checkReport: true, checkDismissed: true } });
    const full = cache?.checkReport ? parseCheckReport(cache.checkReport) : null;
    // Abhaken geht über die Liste, wie sie gerade zu sehen ist – Zurückholen über die volle
    const sicht = full ? (body.action === "dismiss" ? applyDismissed(full, cache?.checkDismissed ?? []) : full) : null;
    const ziel = sicht ? dismissTarget(sicht, body.kind, body.index) : null;
    if (!ziel) throw new ApiError(404, tk("check", "errors.noFinding"));
    const key = dismissKey(ziel.rule, ziel.file);
    const list = new Set(cache?.checkDismissed ?? []);
    if (body.action === "dismiss") {
      if (list.size >= MAX_DISMISSED) throw new ApiError(400, tk("check", "errors.dismissLimit", { n: MAX_DISMISSED }));
      list.add(key);
    } else {
      list.delete(key);
    }
    await db.repoCache.updateMany({ where: { projectId: id }, data: { checkDismissed: [...list] } });
  } else if (body.action === "undismissAll") {
    await db.repoCache.updateMany({ where: { projectId: id }, data: { checkDismissed: [] } });
  } else if (body.action === "setBranch") {
    // Zweig säubern und prüfen (git check-ref-format, grob) – ungültig → 400
    const branch = normalizeCheckBranch(body.branch);
    const error = checkBranchError(branch ?? "");
    if (error) throw new ApiError(400, error);
    await db.project.update({ where: { id }, data: { checkBranch: branch } });
    // Bericht und Lauf des alten Zweigs sind nicht mehr der Stand des neuen: neu einrichten
    await db.repoCache.updateMany({ where: { projectId: id }, data: { checkFetchedAt: null } });
  } else if (body.action === "run") {
    limitOrThrow(`repo-check-run:${id}`, 3, 10 * MINUTE);
    try {
      await startRepoCheck(id);
    } catch (err) {
      if (err instanceof GitError) throw new ApiError(400, err.message);
      throw err;
    }
  } else if (body.action === "refresh") {
    limitOrThrow(`repo-check:${user.id}`, 30, 10 * MINUTE);
    await refreshRepoCheck(id);
  } else {
    limitOrThrow(`repo-check-switch:${id}`, 10, 10 * MINUTE);
    ({ removed, error: warning } = await setRepoCheck(id, body.action === "enable"));
  }
  return json({ check: await view(id), removed, warning, task: task ? { id: task.id, title: task.title } : null, draft });
});
