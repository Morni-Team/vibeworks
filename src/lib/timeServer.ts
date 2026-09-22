import { db } from "./db";
import { entrySeconds, MAX_ENTRY_SECONDS } from "./time";

// Zeiterfassung mit Datenbank: je Konto läuft höchstens ein Eintrag.

/** Laufenden Eintrag beenden – ein vergessener zählt höchstens zwölf Stunden. */
export async function stopRunning(userId: string, at = new Date()) {
  const running = await db.timeEntry.findFirst({ where: { userId, endedAt: null } });
  if (!running) return null;
  const seconds = entrySeconds(running.startedAt, at);
  const endedAt = new Date(running.startedAt.getTime() + seconds * 1000);
  return db.timeEntry.update({ where: { id: running.id }, data: { endedAt, seconds } });
}

export async function currentEntry(userId: string) {
  const running = await db.timeEntry.findFirst({
    where: { userId, endedAt: null },
    include: { task: { select: { id: true, title: true } }, project: { select: { id: true, name: true } } },
  });
  if (!running) return null;
  // Über zwölf Stunden? Dann ist er vergessen worden – abschließen.
  if (Date.now() - running.startedAt.getTime() > MAX_ENTRY_SECONDS * 1000) {
    await stopRunning(userId);
    return null;
  }
  return {
    id: running.id,
    startedAt: running.startedAt.toISOString(),
    focusMinutes: running.focusMinutes,
    task: running.task,
    project: running.project,
  };
}
type CurrentEntry = NonNullable<Awaited<ReturnType<typeof currentEntry>>>;

/** Summe in Sekunden – abgeschlossene Einträge plus der laufende bis jetzt. */
export async function sumSeconds(where: { userId?: string; projectId?: string; taskId?: string; from?: Date; to?: Date }): Promise<number> {
  const filter = {
    ...(where.userId ? { userId: where.userId } : {}),
    ...(where.projectId ? { projectId: where.projectId } : {}),
    ...(where.taskId ? { taskId: where.taskId } : {}),
    ...(where.from || where.to ? { startedAt: { ...(where.from ? { gte: where.from } : {}), ...(where.to ? { lt: where.to } : {}) } } : {}),
  };
  const [closed, open] = await Promise.all([
    db.timeEntry.aggregate({ where: { ...filter, endedAt: { not: null } }, _sum: { seconds: true } }),
    db.timeEntry.findMany({ where: { ...filter, endedAt: null }, select: { startedAt: true } }),
  ]);
  return (closed._sum.seconds ?? 0) + open.reduce((sum, e) => sum + entrySeconds(e.startedAt, null), 0);
}

/** Zeit je Projekt in einem Zeitraum (Wochenrückblick). */
export async function secondsByProject(userId: string, from: Date, to: Date) {
  const entries = await db.timeEntry.findMany({
    where: { userId, startedAt: { gte: from, lt: to } },
    select: { seconds: true, startedAt: true, endedAt: true, project: { select: { id: true, name: true, accent: true } } },
  });
  const map = new Map<string, { id: string; name: string; accent: string; seconds: number }>();
  for (const e of entries) {
    const s = e.endedAt ? e.seconds : entrySeconds(e.startedAt, null);
    const row = map.get(e.project.id) ?? { ...e.project, seconds: 0 };
    row.seconds += s;
    map.set(e.project.id, row);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}
