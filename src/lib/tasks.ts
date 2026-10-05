import type { Prisma, PrismaClient, Task, TaskStatus } from "@/generated/prisma/client";
import { db } from "./db";
import { logActivity } from "./activity";
import { dayKeyToDate, nextDueKey } from "./taskDates";
import { analyzeProgress, progressInput } from "./progress";
import { TASK_STATUSES } from "./status";
import { dayKey, truncate } from "./utils";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Listen laden die langen Texte nicht mit (`omit`), deshalb sind sie hier
 * freiwillig: Fehlen sie, steht in der Antwort `null` statt des Inhalts.
 */
type TaskRow = Omit<Task, "description" | "aiNote"> & { description?: string | null; aiNote?: string | null };

export function serializeTask(t: TaskRow) {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    position: t.position,
    dueDate: t.dueDate ? dayKey(t.dueDate) : null,
    labels: t.labels,
    recurrence: t.recurrence,
    doneAt: t.doneAt?.toISOString() ?? null,
    statusChangedAt: t.statusChangedAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    issueNumber: t.issueNumber,
    issueUrl: t.issueUrl,
    issueError: t.issueError,
    assignee: t.assignee,
    priority: t.priority,
    issueAssignees: t.issueAssignees,
    createdByName: t.createdByName,
    createdVia: t.createdVia,
    aiNote: t.aiNote ?? null,
    aiLocked: t.aiLocked,
    column: t.column,
  };
}
export type TaskItem = ReturnType<typeof serializeTask>;

export const TASK_ORDER = [{ position: "asc" as const }, { createdAt: "asc" as const }];

const statusLabel = (s: TaskStatus) => TASK_STATUSES.find((x) => x.value === s)?.label ?? s;

async function findOwnTask(ownerId: string, id: string) {
  return db.task.findFirst({ where: { id, project: { ownerId } } });
}

export async function nextTaskPosition(client: Client, projectId: string, status: TaskStatus): Promise<number> {
  const last = await client.task.findFirst({ where: { projectId, status }, orderBy: { position: "desc" }, select: { position: true } });
  return (last?.position ?? -1) + 1;
}

/**
 * Statuswechsel mit allen Folgen: Zeitpunkt des Erledigens setzen bzw.
 * löschen, bei wiederkehrenden Aufgaben die nächste Fassung anlegen und den
 * Vorgang im Verlauf festhalten. Nur der Übergang nach „Erledigt“ löst die
 * Wiederholung aus – erneutes Speichern einer erledigten Aufgabe nicht.
 */
export async function transitionTask(
  client: Client,
  task: Task,
  to: TaskStatus,
  userId: string | null,
  data: Prisma.TaskUncheckedUpdateInput = {},
): Promise<{ task: Task; spawned: Task | null }> {
  const from = task.status;
  const update: Prisma.TaskUncheckedUpdateInput = { ...data, status: to };
  // Neuer Status ohne ausdrückliche Spalte: zurück in die Grundspalte (#76)
  if (from !== to && !("column" in data)) update.column = null;
  if (from !== to) update.statusChangedAt = new Date();
  if (to === "DONE" && from !== "DONE") update.doneAt = new Date();
  if (from === "DONE" && to !== "DONE") update.doneAt = null;
  const updated = await client.task.update({ where: { id: task.id }, data: update });

  let spawned: Task | null = null;
  if (to === "DONE" && from !== "DONE" && updated.recurrence) {
    const due = nextDueKey(updated.dueDate ? dayKey(updated.dueDate) : null, updated.recurrence, dayKey(new Date()));
    spawned = await client.task.create({
      data: {
        projectId: updated.projectId,
        title: updated.title,
        description: updated.description,
        labels: updated.labels,
        recurrence: updated.recurrence,
        recurredFrom: updated.id,
        priority: updated.priority,
        assignee: updated.assignee,
        createdById: updated.createdById,
        createdByName: updated.createdByName,
        createdVia: updated.createdVia,
        dueDate: dayKeyToDate(due),
        status: "TODO",
        position: await nextTaskPosition(client, updated.projectId, "TODO"),
      },
    });
  }

  if (from !== to) {
    await logActivity(
      {
        projectId: updated.projectId,
        userId,
        kind: "TASK_MOVED",
        summary: `Aufgabe „${truncate(updated.title, 60)}“: ${statusLabel(from)} → ${statusLabel(to)}`,
        meta: { from, to, taskId: updated.id, title: truncate(updated.title, 60) },
      },
      client,
    );
  }
  return { task: updated, spawned };
}

/**
 * Automatischer Fortschritt – Analyse aus Aufgaben, Entwicklung und Planung
 * (siehe lib/progress). Nur wenn am Projekt eingeschaltet.
 */
export async function syncProjectProgress(projectId: string, client: Client = db): Promise<number | null> {
  const project = await client.project.findUnique({
    where: { id: projectId },
    select: {
      progressFromTasks: true,
      status: true,
      summary: true,
      description: true,
      repoUrl: true,
      repoCache: { select: { commits: true, ci: true } },
      _count: { select: { notes: true } },
    },
  });
  if (!project?.progressFromTasks) return null;
  const groups = await client.task.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } });
  const tasks = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  const { progress } = analyzeProgress(progressInput({ ...project, notes: project._count.notes, tasks }));
  await client.$executeRaw`UPDATE "Project" SET "progress" = ${progress} WHERE "id" = ${projectId}`;
  return progress;
}
