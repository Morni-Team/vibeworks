import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { serializeTask } from "@/lib/tasks";
import { dayKey } from "@/lib/utils";
import { statusLabelsOf } from "@/lib/boardConfig";
import { TaskOverview } from "@/components/tasks/TaskOverview";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT("tasks");
  return { title: t("overview.metaTitle") };
}

// Alle Aufgaben aus allen (nicht archivierten) Projekten, nach Fälligkeit.
// Den heutigen Kalendertag bestimmt der Server – so laufen Server-Render
// und Hydration nicht auseinander, und im Container (UTC) kippt abends
// nichts in den falschen Tag.
//
// Die Übersicht bleibt bewusst schlank: Beschreibung und KI-Notiz bleiben in
// der Datenbank (`omit`) – die Liste zeigt sie nicht, und bei vielen Aufgaben
// machten sie den größten Teil der übertragenen Seite aus. Lange Erledigtes
// bleibt ebenfalls draußen; im Projekt selbst steht weiterhin alles.
const ERLEDIGT_TAGE = 30;
const HOECHSTENS = 1000;

export default async function TasksPage() {
  const user = await requirePageUser();
  const today = dayKey(new Date());
  const seit = new Date(Date.now() - ERLEDIGT_TAGE * 24 * 60 * 60 * 1000);
  const [tasks, projects, focus] = await Promise.all([
    db.task.findMany({
      where: {
        project: { ownerId: user.id, status: { not: "ARCHIVED" } },
        OR: [{ status: { not: "DONE" } }, { doneAt: { gte: seit } }],
      },
      omit: { description: true, aiNote: true },
      include: { project: { select: { id: true, name: true, accent: true, boardConfig: true } } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      take: HOECHSTENS,
    }),
    // Für „Aufgabe für mehrere Projekte“
    db.project.findMany({
      where: { ownerId: user.id, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, accent: true, repoUrl: true },
      orderBy: { name: "asc" },
    }),
    // Für „Heute“ vorgemerkt (Sonne in der Liste)
    db.taskFocus.findMany({ where: { userId: user.id, day: today }, select: { taskId: true } }),
  ]);
  return (
    <TaskOverview
      today={today}
      focusIds={focus.map((f) => f.taskId)}
      initial={tasks.map((t) => ({ ...serializeTask(t), project: { id: t.project.id, name: t.project.name, accent: t.project.accent, labels: statusLabelsOf(t.project.boardConfig) } }))}
      allProjects={projects}
    />
  );
}
