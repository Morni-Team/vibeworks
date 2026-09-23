// „Was ist als Nächstes dran?“ (#192): Eine KI soll nicht vier Werkzeuge
// abfragen und selbst raten müssen, was wichtig ist. Diese Datei bringt alles
// Anstehende in eine Reihenfolge und kürzt es auf das Nötige – ohne Netz und
// Datenbank, damit die Reihenfolge prüfbar bleibt.

/** Warum etwas ansteht – die Reihenfolge dieser Liste ist die Dringlichkeit. */
const NEXT_REASONS = [
  "secrets",
  "vulnerability",
  "siteDown",
  "redCi",
  "gitError",
  "appError",
  "taskOverdue",
  "taskBlocked",
  "taskToday",
  "taskDoing",
  "taskImportant",
  "depsVulnerable",
] as const;
type NextReason = (typeof NEXT_REASONS)[number];

export interface NextStep {
  reason: NextReason;
  /** Ein Satz, der sagt, was los ist. */
  what: string;
  project?: string;
  projectId?: string;
  task?: string;
  /** Werkzeug, mit dem es weitergeht. */
  next: string;
  /** Vom Menschen angelegt – solche Aufgaben zählen mehr als selbst erzeugte. */
  fromUser?: boolean;
}

const RANK = new Map<NextReason, number>(NEXT_REASONS.map((r, i) => [r, i]));

/**
 * Sortiert nach Dringlichkeit und kürzt. Bei gleichem Grund stehen Aufgaben
 * vorn, die ein Mensch angelegt hat – nach denen fragt der Nutzer zuerst.
 */
export function rankNextSteps(steps: NextStep[], limit = 12): NextStep[] {
  return [...steps]
    .sort((a, b) => {
      const byReason = (RANK.get(a.reason) ?? 99) - (RANK.get(b.reason) ?? 99);
      if (byReason !== 0) return byReason;
      return Number(b.fromUser ?? false) - Number(a.fromUser ?? false);
    })
    .slice(0, Math.max(1, limit));
}

/** Kurzfassung für den Kopf der Antwort: „3 dringend · 5 Aufgaben“. */
export function nextSummary(steps: NextStep[]): { urgent: number; tasks: number; total: number } {
  const urgent = steps.filter((s) => ["secrets", "vulnerability", "siteDown", "redCi", "gitError"].includes(s.reason)).length;
  const tasks = steps.filter((s) => s.reason.startsWith("task")).length;
  return { urgent, tasks, total: steps.length };
}

/** Welcher Grund gilt für eine Aufgabe? Der dringendste, der zutrifft. */
export function taskReason(task: { status: string; dueDate: string | null; priority: number }, today: string): NextReason | null {
  if (task.status === "DONE") return null;
  if (task.status === "BLOCKED") return "taskBlocked";
  if (task.dueDate && task.dueDate < today) return "taskOverdue";
  if (task.dueDate === today) return "taskToday";
  if (task.status === "DOING") return "taskDoing";
  if (task.priority >= 3) return "taskImportant";
  return null;
}
