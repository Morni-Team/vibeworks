"use client";

import { useState } from "react";
import Link from "next/link";
import type { TaskStatus } from "@/generated/prisma/client";
import { Check, ListChecks, Plus, Sun, X } from "lucide-react";
import type { OverviewTask } from "@/components/tasks/TaskOverview";
import { DueBadge } from "@/components/tasks/TaskBoard";
import { accentGradient } from "@/components/projects/ProjectCard";
import { api, errorMessage } from "@/lib/client/api";
import { useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { dayKeyToDate } from "@/lib/taskDates";
import { formatDuration } from "@/lib/time";
import { TimerButtons } from "@/components/time/TimerPill";
import { cn } from "@/lib/utils";

function ProjectLink({ project }: { project: OverviewTask["project"] }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="mt-0.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted hover:text-fg"
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: accentGradient(project.accent) }}
      />
      {project.name}
    </Link>
  );
}

function FocusTaskItem({
  task,
  today,
  isDone,
  onToggle,
  onRemove,
  onError,
}: {
  task: OverviewTask;
  today: string;
  isDone: boolean;
  onToggle: (task: OverviewTask) => void;
  onRemove: (task: OverviewTask) => void;
  onError: (error: string | null) => void;
}) {
  const tt = useT("tasks");
  const t = useT("today");

  return (
    <li
      data-testid="focus-task"
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        isDone && "opacity-70",
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={
          isDone
            ? tt("card.reopen", { title: task.title })
            : tt("card.complete", { title: task.title })
        }
        onClick={() => void onToggle(task)}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
          isDone
            ? "border-emerald-400 bg-emerald-400 text-black"
            : "hover:border-emerald-400",
        )}
      >
        {isDone && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate", isDone && "text-muted line-through")}>
          {task.title}
        </p>
        <ProjectLink project={task.project} />
      </div>
      {task.dueDate && (
        <DueBadge dueDate={task.dueDate} done={isDone} today={today} />
      )}
      {!isDone && <TimerButtons taskId={task.id} focus onError={onError} />}
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => void onRemove(task)}
        aria-label={t("remove")}
        title={t("remove")}
      >
        <X size={15} />
      </button>
    </li>
  );
}

function SuggestionTaskItem({
  task,
  today,
  onAdd,
}: {
  task: OverviewTask;
  today: string;
  onAdd: (task: OverviewTask) => void;
}) {
  const t = useT("today");
  const ts = useT("status");

  return (
    <li
      data-testid="suggestion"
      className="flex items-center gap-3 rounded-xl border px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{task.title}</p>
        <ProjectLink project={task.project} />
      </div>
      {task.status === "DOING" && (
        <span className="text-xs text-accent-ink">{ts("task.DOING")}</span>
      )}
      {task.dueDate && (
        <DueBadge dueDate={task.dueDate} done={false} today={today} />
      )}
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => void onAdd(task)}
      >
        <Plus size={14} /> {t("add")}
      </button>
    </li>
  );
}

/** Heute: bis zu fünf Aufgaben aus allen Projekten, dazu Vorschläge. */
export function TodayView({
  today,
  focus: initialFocus,
  suggestions: initialSuggestions,
  doneToday: initialDone,
  timeToday = 0,
}: {
  today: string;
  focus: OverviewTask[];
  suggestions: OverviewTask[];
  doneToday: number;
  /** Heute erfasste Zeit in Sekunden */
  timeToday?: number;
}) {
  const tm = useT("time");
  // Heute insgesamt erledigt – läuft beim Abhaken hier mit
  const [doneToday, setDoneToday] = useState(initialDone);
  const t = useT("today");
  const locale = useLocale();
  const [focus, setFocus] = useState(initialFocus);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [error, setError] = useState<string | null>(null);

  const done = focus.filter((x) => x.status === "DONE").length;
  const heading = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dayKeyToDate(today));

  async function add(task: OverviewTask) {
    setError(null);
    try {
      await api("/api/today", { body: { taskId: task.id } });
      setFocus((f) => [...f, task]);
      setSuggestions((s) => s.filter((x) => x.id !== task.id));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remove(task: OverviewTask) {
    setError(null);
    try {
      await api(`/api/today?taskId=${encodeURIComponent(task.id)}`, {
        method: "DELETE",
      });
      setFocus((f) => f.filter((x) => x.id !== task.id));
      if (task.status !== "DONE") setSuggestions((s) => [task, ...s]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function toggle(task: OverviewTask) {
    const status: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    const before = focus;
    const delta = status === "DONE" ? 1 : -1;
    setFocus((f) => f.map((x) => (x.id === task.id ? { ...x, status } : x)));
    setDoneToday((n) => Math.max(0, n + delta));
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body: { status } });
    } catch (e) {
      setFocus(before);
      setDoneToday((n) => Math.max(0, n - delta));
      setError(errorMessage(e));
    }
  }

  return (
    <div className="fade-in mx-auto max-w-3xl space-y-6">
      <header>
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent-ink">
          <Sun size={15} /> {t("title")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-1 text-muted">
          {focus.length
            ? t("summary", { done, n: focus.length })
            : t("emptyHint")}
        </p>
        {focus.length > 0 && (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={focus.length}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${(done / focus.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      <section aria-labelledby="focus-heading" className="glass p-5">
        <h2
          id="focus-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted"
        >
          {t("focus")} · {focus.length}
        </h2>
        {focus.length === 0 && (
          <p className="text-sm text-muted">{t("emptyFocus")}</p>
        )}
        <ul className="space-y-2">
          {focus.map((task) => (
            <FocusTaskItem
              key={task.id}
              task={task}
              today={today}
              isDone={task.status === "DONE"}
              onToggle={toggle}
              onRemove={remove}
              onError={setError}
            />
          ))}
        </ul>
        {focus.length > 0 && done === focus.length && (
          <p className="mt-4 text-center font-medium text-emerald-400">
            {t("allDone")}
          </p>
        )}
      </section>

      <section aria-labelledby="suggest-heading" className="glass p-5">
        <h2
          id="suggest-heading"
          className="text-sm font-semibold uppercase tracking-wider text-muted"
        >
          {t("suggestions")}
        </h2>
        <p className="mb-3 text-xs text-muted">{t("suggestionsHint")}</p>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">{t("noSuggestions")}</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((task) => (
              <SuggestionTaskItem
                key={task.id}
                task={task}
                today={today}
                onAdd={add}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>
          {t("doneToday", { n: doneToday })}
          {timeToday > 0 && (
            <> · {tm("today", { d: formatDuration(timeToday) })}</>
          )}
        </span>
        <Link href="/tasks" className="btn btn-sm">
          <ListChecks size={14} /> {t("toTasks")}
        </Link>
      </p>
    </div>
  );
}
