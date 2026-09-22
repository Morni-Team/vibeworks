import type { AppError } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { createTask, type TaskVia } from "@/lib/actions";
import { INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { makeT } from "@/lib/i18n/messages";
import { taskCreateSchema } from "@/lib/validation";
import { truncate } from "@/lib/utils";
import { hit, MINUTE } from "@/lib/security/rateLimit";

// Aufgabe aus einem Fehler des Fehler-Eingangs – per Knopf („Als Aufgabe“,
// „Notfix“) oder automatisch (#39). Aufgaben können als Issue in ein
// (womöglich öffentliches) Repository wandern – deshalb nur Nachricht und
// Anzahl, keine Stack-, Seiten- oder Client-Angaben. Die Details bleiben im
// Eingang, der Link führt dorthin.

export const AUTO_TASK_MODES = ["off", "notfix"] as const;
type AutoTaskMode = (typeof AUTO_TASK_MODES)[number];
/** Höchstens so viele automatische Aufgaben je Projekt und Stunde – ein kaputtes Release soll das Board nicht fluten. */
const AUTO_TASKS_PER_HOUR = 5;

export async function taskFromError(userId: string, e: AppError, opts: { notfix: boolean; locale: Locale; via?: TaskVia }) {
  const t = makeT(opts.locale, "bugs");
  const date = new Intl.DateTimeFormat(INTL_LOCALE[opts.locale], { dateStyle: "medium", timeStyle: "short" }).format(e.lastSeen);
  const description = [t("task.intro", { n: e.count, date }), "", `**${e.type ? `${e.type}: ` : ""}${e.message}**`, "", `${config.appUrl}/projects/${e.projectId}#fehler`].join("\n");
  const input = taskCreateSchema.parse({
    title: (opts.notfix ? t("task.notfixTitle", { message: truncate(e.message, 110) }) : t("task.title", { message: truncate(e.message, 120) })).slice(0, 200),
    description: opts.notfix ? [t("task.notfixIntro"), "", description].join("\n") : description,
    labels: opts.notfix ? [t("task.label"), t("task.notfixLabel")] : [t("task.label")],
    ...(opts.notfix ? { priority: 4, dueDate: new Date().toISOString().slice(0, 10) } : {}),
  });
  const { task } = await createTask(userId, e.projectId, input, opts.via ?? "web");
  return db.appError.update({ where: { id: e.id }, data: { taskId: task.id } });
}

/**
 * Fehler-Agent (#39): neuer oder zurückgekehrter Fehler → Notfix-Aufgabe für
 * Claude, wenn das Projekt es so eingestellt hat. Wirft nie.
 */
export async function autoTaskForError(errorId: string): Promise<void> {
  try {
    const e = await db.appError.findUnique({ where: { id: errorId }, include: { project: { select: { errorAutoTask: true, ownerId: true, status: true, owner: { select: { locale: true } } } } } });
    if (!e || e.project.errorAutoTask !== "notfix" || e.project.status === "ARCHIVED") return;
    // Gibt es schon eine offene Aufgabe zu diesem Fehler, reicht die
    if (e.taskId && (await db.task.findFirst({ where: { id: e.taskId, status: { not: "DONE" } }, select: { id: true } }))) return;
    if (!hit(`auto-notfix:${e.projectId}`, AUTO_TASKS_PER_HOUR, 60 * MINUTE).ok) return;
    const locale: Locale = isLocale(e.project.owner.locale) ? e.project.owner.locale : "de";
    await taskFromError(e.project.ownerId, e, { notfix: true, locale, via: "auto" });
  } catch (err) {
    console.error("[auto-notfix]", errorId, err);
  }
}
