"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TaskStatus } from "@/generated/prisma/client";
import { Check, CheckCheck, ListPlus, Repeat, Sun } from "lucide-react";
import { BulkTaskDialog, type BulkProject } from "./BulkTaskDialog";
import { TimerButtons } from "@/components/time/TimerPill";
import type { TaskItem } from "@/lib/tasks";
import { BUCKETS, bucketOf, recurrenceLabel, type Bucket } from "@/lib/taskDates";
import { TASK_STATUSES } from "@/lib/status";
import { api, errorMessage } from "@/lib/client/api";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { accentGradient } from "@/components/projects/ProjectCard";
import { DueBadge } from "./TaskBoard";
import { TaskDialog, type TaskForm } from "./TaskDialog";
import type { StatusLabels } from "@/lib/boardConfig";

/** labels: eigene Spaltennamen des Projekts (#72) */
type ProjectRef = { id: string; name: string; accent: string; labels?: StatusLabels };
export type OverviewTask = TaskItem & { project: ProjectRef };

const STATUS_TONE: Record<TaskStatus, string> = {
  TODO: "text-muted",
  DOING: "text-accent-ink",
  BLOCKED: "text-red-400",
  DONE: "text-emerald-400",
};

const BUCKET_TONE: Partial<Record<Bucket, string>> = { overdue: "text-red-400", today: "text-amber-400" };
/** So viele Zeilen je Abschnitt auf einmal – der Rest kommt auf Knopfdruck. */
const PRO_GRUPPE = 40;

const byDue = (a: OverviewTask, b: OverviewTask) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.createdAt.localeCompare(b.createdAt);

export function TaskOverview({ initial, today, allProjects = [], focusIds = [] }: { initial: OverviewTask[]; today: string; allProjects?: BulkProject[]; focusIds?: string[] }) {
  const t = useT("tasks");
  const tday = useT("today");
  const [focus, setFocus] = useState(() => new Set(focusIds));

  // Sonne: für die Heute-Ansicht vormerken bzw. wieder herausnehmen
  async function toggleFocus(task: OverviewTask) {
    setError(null);
    const on = !focus.has(task.id);
    try {
      if (on) await api("/api/today", { body: { taskId: task.id } });
      else await api(`/api/today?taskId=${encodeURIComponent(task.id)}`, { method: "DELETE" });
      setFocus((s) => {
        const next = new Set(s);
        if (on) next.add(task.id);
        else next.delete(task.id);
        return next;
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const ts = useT("status");
  const locale = useLocale();
  const [tasks, setTasks] = useState(initial);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  // Lange Listen zeigen erst einen Teil – sonst stehen bei vielen Aufgaben
  // hunderte Zeilen im HTML, und die Seite wird zäh (#214).
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const [showDone, setShowDone] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [editing, setEditing] = useState<OverviewTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projects = useMemo(() => {
    const map = new Map<string, ProjectRef>();
    for (const t of tasks) map.set(t.project.id, t.project);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, INTL_LOCALE[locale]));
  }, [tasks, locale]);

  const inProject = useMemo(() => tasks.filter((t) => !projectId || t.project.id === projectId), [tasks, projectId]);
  const counts = useMemo(() => {
    const c: Partial<Record<TaskStatus, number>> = {};
    for (const t of inProject) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [inProject]);

  // Gemerkt: Bei vielen Aufgaben lief das Filtern und Sortieren sonst bei
  // jedem Tastendruck in der Oberfläche erneut durch die ganze Liste (#214).
  const visible = useMemo(
    () => inProject.filter((t) => (showDone || t.status !== "DONE") && (!statuses.length || statuses.includes(t.status))),
    [inProject, showDone, statuses],
  );
  const groups = useMemo(
    () => BUCKETS.map((b) => ({ ...b, items: visible.filter((t) => bucketOf(t.dueDate, today) === b.value).sort(byDue) })),
    [visible, today],
  );

  function merge(list: Array<TaskItem | null | undefined>, project: ProjectRef) {
    setTasks((ts) => {
      let next = [...ts];
      for (const t of list) {
        if (!t) continue;
        const item = { ...t, project };
        next = next.some((x) => x.id === t.id) ? next.map((x) => (x.id === t.id ? item : x)) : [...next, item];
      }
      return next;
    });
  }

  async function patch(t: OverviewTask, body: object) {
    setError(null);
    const res = await api<{ task: TaskItem; spawned: TaskItem | null }>(`/api/tasks/${t.id}`, { method: "PATCH", body });
    merge([res.task, res.spawned], t.project);
  }

  // Abhaken direkt aus der Liste: Zeitpunkt, abgeleiteter Projektfortschritt
  // und bei wiederkehrenden Aufgaben die nächste Fassung erledigt der Server.
  function toggle(t: OverviewTask) {
    const status: TaskStatus = t.status === "DONE" ? "TODO" : "DONE";
    const before = tasks;
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
    patch(t, { status }).catch((e) => {
      setTasks(before);
      setError(errorMessage(e));
    });
  }

  const toggleStatus = (s: TaskStatus) => setStatuses((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  const openCount = inProject.filter((t) => t.status !== "DONE").length;

  return (
    <div className="fade-in">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("overview.title")}</h1>
          <p className="mt-1 text-muted">
            {openCount === 0 ? t("overview.allDone") : t("overview.summary", { open: openCount, n: projects.length })}
          </p>
        </div>
        {allProjects.length > 0 && (
          <button className="btn btn-sm" onClick={() => setBulkOpen(true)}>
            <ListPlus size={14} /> {t("overview.bulk.open")}
          </button>
        )}
      </header>
      {notice && <p role="status" className="mb-4 text-sm text-emerald-400">{notice}</p>}

      <div className="glass mb-6 flex flex-wrap items-center gap-2 p-2">
        {TASK_STATUSES.filter((s) => s.value !== "DONE").map((s) => (
          <button key={s.value} className={cn("chip", statuses.includes(s.value) && "chip-active")} aria-pressed={statuses.includes(s.value)} onClick={() => toggleStatus(s.value)}>
            <span className={STATUS_TONE[s.value]}>●</span> {ts(`task.${s.value}`)} <span className="tabular-nums opacity-70">{counts[s.value] ?? 0}</span>
          </button>
        ))}
        <button className={cn("chip", showDone && "chip-active")} aria-pressed={showDone} onClick={() => setShowDone((v) => !v)}>
          <CheckCheck size={13} /> {t("overview.showDone")} <span className="tabular-nums opacity-70">{counts.DONE ?? 0}</span>
        </button>
        <select className="field ml-auto !w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label={t("overview.filterProject")}>
          <option value="">{t("overview.allProjects")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {visible.length === 0 ? (
        <div className="glass px-6 py-14 text-center">
          <p className="font-medium">{statuses.length || projectId ? t("overview.emptyFiltered") : t("overview.emptyOpen")}</p>
          <p className="mt-1 text-sm text-muted">{t("overview.emptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.value} aria-labelledby={`bucket-${g.value}`}>
                <h2 id={`bucket-${g.value}`} className={cn("mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider", BUCKET_TONE[g.value] ?? "text-muted")}>
                  {ts(`bucket.${g.value}`)} <span className="font-normal">{g.items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {(shown.has(g.value) ? g.items : g.items.slice(0, PRO_GRUPPE)).map((task) => {
                    const done = task.status === "DONE";
                    return (
                      <li key={task.id} className={cn("glass flex items-center gap-3 !rounded-xl px-3 py-2.5", done && "opacity-70")}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={done ? t("card.reopen", { title: task.title }) : t("card.complete", { title: task.title })}
                          onClick={() => toggle(task)}
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                            done ? "border-emerald-400 bg-emerald-400 text-black" : "hover:border-emerald-400",
                          )}
                        >
                          {done && <Check size={13} strokeWidth={3} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => setEditing(task)} className="block max-w-full truncate text-left text-sm hover:text-accent-ink">
                            <span className={cn(done && "text-muted line-through")}>{task.title}</span>
                          </button>
                          <Link href={`/projects/${task.project.id}`} className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted hover:text-fg">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accentGradient(task.project.accent) }} />
                            {task.project.name}
                          </Link>
                        </div>
                        <div className="hidden items-center gap-1.5 md:flex">
                          {task.labels.slice(0, 3).map((l) => (
                            <span key={l} className="rounded-md bg-fg/10 px-1.5 text-[11px] text-muted">{l}</span>
                          ))}
                        </div>
                        {task.recurrence && <Repeat size={14} className="shrink-0 text-muted" aria-label={recurrenceLabel(task.recurrence, locale)} />}
                        {!done && <TimerButtons taskId={task.id} onError={setError} />}
                        {!done && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm shrink-0"
                            aria-pressed={focus.has(task.id)}
                            aria-label={focus.has(task.id) ? tday("toggleRemove") : tday("toggleAdd")}
                            title={focus.has(task.id) ? tday("toggleRemove") : tday("toggleAdd")}
                            onClick={() => void toggleFocus(task)}
                          >
                            <Sun size={15} className={focus.has(task.id) ? "fill-amber-400 text-amber-400" : "text-muted"} />
                          </button>
                        )}
                        <span className={cn("hidden w-20 shrink-0 text-right text-xs sm:inline", STATUS_TONE[task.status])}>
                          {(task.column && task.project.labels?.[task.column]) || task.project.labels?.[task.status] || ts(`task.${task.status}`)}
                        </span>
                        <span className="w-24 shrink-0 text-right">{task.dueDate && <DueBadge dueDate={task.dueDate} done={done} today={today} />}</span>
                      </li>
                    );
                  })}
                </ul>
                {g.items.length > PRO_GRUPPE && !shown.has(g.value) && (
                  <button className="btn btn-sm mt-3" onClick={() => setShown((s) => new Set(s).add(g.value))}>
                    {t("overview.showMore", { n: g.items.length - PRO_GRUPPE })}
                  </button>
                )}
              </section>
            ),
          )}
        </div>
      )}

      <BulkTaskDialog
        open={bulkOpen}
        projects={allProjects}
        onClose={() => setBulkOpen(false)}
        onCreated={(created, skipped) => {
          setTasks((list) => [...list, ...created]);
          setNotice(t("overview.bulk.created", { n: created.length }) + (skipped ? ` ${t("overview.bulk.skipped", { n: skipped })}` : ""));
        }}
      />

      <TaskDialog
        open={editing !== null}
        task={editing}
        statusLabels={editing?.project.labels}
        onClose={() => setEditing(null)}
        onSave={async (form: TaskForm) => {
          if (editing) await patch(editing, { ...form, recurrence: form.recurrence || null });
        }}
        onDelete={async (t) => {
          await api(`/api/tasks/${t.id}`, { method: "DELETE" });
          setTasks((ts) => ts.filter((x) => x.id !== t.id));
        }}
      />
    </div>
  );
}
