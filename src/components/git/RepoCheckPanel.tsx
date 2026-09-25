"use client";

import { useEffect, useState } from "react";
import { Bug, Check, Copy, ExternalLink, EyeOff, KeyRound, ListPlus, ListTodo, RefreshCw, RotateCcw, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { CHECK_TASK_MODES, type CheckTaskMode } from "@/lib/git/checkTasksLogic";
import { useRouter } from "next/navigation";
import { TaskDialog, type TaskForm } from "@/components/tasks/TaskDialog";
import { toast } from "@/components/ui/Toaster";
import type { RepoCheckView } from "@/lib/git/repoCheck";
import { blobUrl, checkIsUrgent, type CheckReport } from "@/lib/git/repoCheckLogic";
import { GITHUB_NEW_TOKEN_URL } from "@/lib/git/parse";
import { api, errorMessage } from "@/lib/client/api";
import { useFormat, useMsg, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { confirmDialog } from "@/lib/client/dialogs";

type Kind = "secrets" | "vulnerabilities" | "findings" | "todos";
type Action = "run" | "refresh" | "enable" | "disable" | "task" | "draft" | "autoTasks" | "setBranch" | "dismiss" | "undismiss" | "undismissAll";

const KINDS: Kind[] = ["secrets", "vulnerabilities", "findings", "todos"];
const TOOL: Record<Kind, keyof CheckReport["tools"]> = { secrets: "gitleaks", vulnerabilities: "osv", findings: "semgrep", todos: "todos" };
const ICON: Record<Kind, typeof Bug> = { secrets: KeyRound, vulnerabilities: ShieldAlert, findings: Bug, todos: ListTodo };
const PAGE = 25;
/** Solange ein Lauf aussteht, so oft nachsehen (nur bei sichtbarem Tab). */
const POLL_MS = 60_000;

interface Row {
  key: string;
  index: number;
  title: string;
  sub: string;
  href: string | null;
  /** Werte für Erklärung und Prompt */
  vars: Record<string, string>;
}

function rowsOf(kind: Kind, r: CheckReport, webUrl: string, branch: string | null): Row[] {
  const ref = r.commit || branch || "";
  const at = (file: string, line: number | null) => `${file}${line ? `:${line}` : ""}`;
  if (kind === "secrets") {
    return r.secrets.map((s, i) => ({
      key: `s${i}`,
      index: i,
      title: s.description || s.rule,
      sub: `${at(s.file, s.line)} · ${s.rule}${s.commit ? ` · ${s.commit.slice(0, 7)}` : ""}`,
      href: blobUrl(webUrl, s.commit || ref, s.file, s.line),
      vars: { rule: s.rule || "?", file: at(s.file, s.line) },
    }));
  }
  if (kind === "vulnerabilities") {
    return r.vulnerabilities.map((v, i) => ({
      key: `v${i}`,
      index: i,
      title: `${v.package} ${v.version}`,
      sub: [v.id, v.severity && `CVSS ${v.severity}`, v.summary, v.source].filter(Boolean).join(" · "),
      href: /^[A-Za-z0-9._:-]+$/.test(v.id) ? `https://osv.dev/vulnerability/${encodeURIComponent(v.id)}` : null,
      vars: { pkg: v.package, version: v.version || "?", id: v.id || "?" },
    }));
  }
  if (kind === "findings") {
    return r.findings.map((x, i) => ({
      key: `f${i}`,
      index: i,
      title: x.message || x.rule,
      sub: `${at(x.file, x.line)} · ${x.rule}${x.severity ? ` · ${x.severity}` : ""}`,
      href: blobUrl(webUrl, ref, x.file, x.line),
      vars: { rule: x.rule || "?", file: at(x.file, x.line) },
    }));
  }
  return r.todos.map((x, i) => ({ key: `t${i}`, index: i, title: x.text, sub: at(x.file, x.line), href: blobUrl(webUrl, ref, x.file, x.line), vars: {} }));
}

function countTone(kind: Kind, n: number) {
  if (!n) return "text-emerald-400";
  return kind === "secrets" || kind === "vulnerabilities" ? "text-red-400" : kind === "findings" ? "text-amber-400" : "";
}

/** Repo-Check: Zahlen, Fundstellen mit Links ins Repository, „Jetzt prüfen“ und (Besitzer) ein/aus. */
export function RepoCheckPanel({
  projectId,
  initial,
  canRun,
  canManage,
  canEditSettings = false,
  canTask = false,
  hasToken,
}: {
  projectId: string;
  initial: RepoCheckView;
  canRun: boolean;
  canManage: boolean;
  /** Zweig und automatische Aufgaben ändern – dafür genügt „Projekt bearbeiten“ (#205) */
  canEditSettings?: boolean;
  canTask?: boolean;
  hasToken: boolean;
}) {
  const t = useT("check");
  const f = useFormat();
  const msg = useMsg();
  const [check, setCheck] = useState(initial);
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<Kind | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [copied, setCopied] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TaskForm> | null>(null);
  const [branch, setBranch] = useState(initial.branch ?? "");
  const router = useRouter();

  // „Als Aufgabe“ (#60): erst das Aufgaben-Fenster mit dem Vorschlag, angelegt wird beim Speichern
  async function openDraft(kind: string, index: number) {
    setBusy("draft");
    setError(null);
    try {
      const res = await api<{ draft: { title: string; description: string; labels: string[]; priority: number; assignee: string; existing: { title: string } | null } | null }>(`/api/projects/${projectId}/check`, { body: { action: "draft", kind, index } });
      if (res.draft?.existing) {
        setNote(t("tasks.exists", { title: res.draft.existing.title }));
        toast(t("tasks.exists", { title: res.draft.existing.title }), "error");
      }
      else if (res.draft) setDraft({ title: res.draft.title, description: res.draft.description, labels: res.draft.labels.join(", "), priority: res.draft.priority, assignee: res.draft.assignee });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  // Umsetzen macht Claude Code bei dir – VibeWorks erklärt und liefert den Auftrag (#29)
  async function copyPrompt(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* ohne Zwischenablage (kein HTTPS) steht der Text ja darüber */
    }
  }
  useEffect(() => setCheck(initial), [initial]);
  useEffect(() => setBranch(initial.branch ?? ""), [initial.branch]);

  async function send(action: Action, extra: Record<string, unknown> = {}) {
    const res = await api<{ check: RepoCheckView; removed: boolean; warning: string | null; task?: { title: string } | null }>(`/api/projects/${projectId}/check`, { body: { action, ...extra } });
    setCheck(res.check);
    return res;
  }

  async function act(action: Action, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    setNote(null);
    try {
      const res = await send(action, extra);
      if (action === "task" && res.task) {
        setNote(t("tasks.created", { title: res.task.title }));
        toast(t("tasks.created", { title: res.task.title }));
      }
      if (action === "autoTasks") setNote(t("tasks.saved"));
      if (action === "disable") setNote(res.warning ? t("removeFailed", { error: msg(res.warning) }) : res.removed ? t("removed") : null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  // Zweig speichern (#125): nur der Besitzer – leer heißt Standardzweig
  async function saveBranch() {
    if ((initial.branch ?? "") === branch.trim()) return;
    await act("setBranch", { branch: branch.trim() || null });
    setNote(t("branch.saved"));
  }

  const pending = check.enabled && (check.status === "waiting" || check.status === "running");
  useEffect(() => {
    if (!canRun || !check.enabled) return;
    // Noch nicht eingerichtet: gleich anstoßen statt auf den nächsten Abgleich zu warten
    if (!check.status && hasToken) void send("refresh").catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim Öffnen
  }, []);
  useEffect(() => {
    if (!pending || !canRun) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void send("refresh").catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send ändert sich nicht wesentlich
  }, [pending, canRun]);

  const r = check.report;
  const urgent = checkIsUrgent(r);
  // Fallback-Zweig für Datei-Links: der Bericht nennt den Commit, sonst der gewählte Zweig
  const rows = r && open ? rowsOf(open, r, check.webUrl, check.branch) : [];

  return (
    <section id="repo-check" className="glass p-6 sm:p-8" aria-labelledby="check-heading">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="check-heading" className="flex items-center gap-2 text-lg font-semibold">
          {urgent ? <ShieldAlert size={18} className="text-red-400" /> : <ShieldCheck size={18} className="text-emerald-400" />} {t("title")}
        </h2>
        {check.runAt && (
          <span className="text-xs text-muted" suppressHydrationWarning>
            {t("lastRun", { ago: f.ago(check.runAt) })}
          </span>
        )}
        {check.runUrl && (
          <a href={check.runUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent-ink hover:underline">
            {t("openRun")} <ExternalLink size={11} />
          </a>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {canRun && check.enabled && (
            <button type="button" className="btn btn-sm" disabled={busy !== null || check.status === "running"} onClick={() => void act("run")}>
              <RefreshCw size={14} className={cn((busy === "run" || check.status === "running") && "animate-spin")} /> {check.status === "running" ? t("running") : t("run")}
            </button>
          )}
          {canManage &&
            (check.enabled ? (
              <button type="button" className="btn btn-sm hover:!text-red-400" disabled={busy !== null} onClick={() => void confirmDialog(t("confirmDisable"), { danger: true }).then((ok) => void (ok && act("disable")))}>
                {t("disable")}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => void act("enable")}>
                {t("enable")}
              </button>
            ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-muted">
        {t("hint")} {t("private")} {t("ignoreHint")}
      </p>
      {canEditSettings && check.enabled && (
        <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t("tasks.modeLabel")}</span>
          <select
            className="field w-auto py-1 text-sm"
            data-testid="check-auto-tasks"
            value={check.autoTasks}
            disabled={busy !== null}
            onChange={(e) => void act("autoTasks", { mode: e.target.value as CheckTaskMode })}
          >
            {CHECK_TASK_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`tasks.mode.${m}`)}
              </option>
            ))}
          </select>
          <span className="w-full text-xs text-muted">{t("tasks.modeHint")}</span>
        </label>
      )}

      {canEditSettings && check.enabled && (
        <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t("branch.label")}</span>
          <input
            type="text"
            className="field w-auto min-w-40 py-1 text-sm"
            data-testid="check-branch"
            value={branch}
            placeholder={check.defaultBranch ?? "main"}
            disabled={busy !== null}
            onChange={(e) => setBranch(e.target.value)}
            onBlur={() => void saveBranch()}
          />
          <span className="w-full text-xs text-muted">{t("branch.hint")}</span>
        </label>
      )}

      {!check.enabled ? (
        <p className="text-sm text-muted">{t("off")}</p>
      ) : (
        <>
          {canManage && !hasToken && (
            <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              {t("needToken")}{" "}
              <a href={GITHUB_NEW_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="underline">
                {t("createToken")}
              </a>
            </p>
          )}
          {check.error ? (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>
                {msg(check.error)}
                {check.status === "noPermission" && canManage && (
                  <>
                    {" "}
                    <a href={GITHUB_NEW_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      {t("createToken")}
                    </a>
                  </>
                )}
              </span>
            </p>
          ) : (
            check.status !== "done" &&
            check.status !== "noPermission" &&
            (hasToken || !canManage) && <p className="mb-3 text-sm text-muted">{t(`status.${check.status ?? "none"}`)}</p>
          )}

          {/* Der Bericht gehört zu einem älteren Commit (#148) – sonst hält man alte Funde für den aktuellen Stand */}
          {check.stale && r && (
            <p className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400" data-testid="check-stale">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" /> <span>{t("stale", { commit: r.commit.slice(0, 7) })}</span>
            </p>
          )}
          {/* Sichtbar machen, dass Projekt-Ausnahmen etwas weggefiltert haben (#197) */}
          {r && (r.suppressed ?? 0) > 0 && (
            <p className="mb-3 text-xs text-muted" data-testid="check-suppressed">
              {t("suppressed", { n: r.suppressed ?? 0 })}
            </p>
          )}
          {/* Abgebrochene Werkzeuge nennen, statt den Lauf als sauber zu zeigen (#149) */}
          {r && r.toolErrors.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400" data-testid="check-tool-errors">
              <p className="flex items-start gap-2">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" /> <span>{t("toolErrors", { n: r.toolErrors.length })}</span>
              </p>
              <ul className="mt-1 ml-6 list-disc text-xs">
                {r.toolErrors.map((e) => (
                  <li key={e.tool}>{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {r && (
            <>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {KINDS.map((k) => {
                  const Icon = ICON[k];
                  const ran = r.tools[TOOL[k]];
                  return (
                    <button
                      key={k}
                      type="button"
                      data-testid={`check-${k}`}
                      onClick={() => {
                        setOpen((o) => (o === k ? null : k));
                        setShown(PAGE);
                      }}
                      aria-expanded={open === k}
                      className={cn("rounded-2xl border bg-bg/25 px-3 py-2.5 text-left transition hover:border-accent/50", open === k && "border-accent/60 bg-accent/10")}
                    >
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <Icon size={13} /> {t(`counts.${k}`)}
                      </span>
                      <span className={cn("mt-0.5 block text-lg font-semibold tabular-nums", ran && countTone(k, r.counts[k]))}>{ran ? r.counts[k] : "–"}</span>
                    </button>
                  );
                })}
              </div>
              {!urgent && !open && <p className="text-sm text-emerald-400">{t("allGood")}</p>}
              {open && (
                <div className="rounded-2xl border bg-bg/25 p-3">
                  <p className="mb-2 text-xs font-medium text-muted">{t(`sections.${open}`)}</p>
                  {open === "secrets" && r.counts.secrets > 0 && <p className="mb-2 text-xs text-amber-400">{t("secretHint")}</p>}
                  {!r.tools[TOOL[open]] ? (
                    <p className="text-sm text-muted">{t("toolMissing")}</p>
                  ) : rows.length === 0 ? (
                    <p className="text-sm text-muted">{t("empty")}</p>
                  ) : (
                    <ul className="divide-y divide-fg/10">
                      {rows.slice(0, shown).map((row) => (
                        <li key={row.key} className="py-1.5">
                          {row.href ? (
                            <a href={row.href} target="_blank" rel="noopener noreferrer" className="block break-words text-sm hover:text-accent-ink">
                              {row.title} <ExternalLink size={10} className="inline" />
                            </a>
                          ) : (
                            <span className="block break-words text-sm">{row.title}</span>
                          )}
                          <span className="block break-all font-mono text-[11px] text-muted">{row.sub}</span>
                          {open !== "todos" && (
                            <details className="mt-1 text-xs" data-testid="check-explain">
                              <summary className="cursor-pointer text-accent-ink">{t("explain.toggle")}</summary>
                              <p className="mt-1 text-muted">{t(`explain.${open}.why`, row.vars)}</p>
                              <p className="mt-1">{t(`explain.${open}.fix`, row.vars)}</p>
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                <button type="button" className="btn btn-sm" onClick={() => void copyPrompt(row.key, t(`explain.${open}.prompt`, row.vars))}>
                                  {copied === row.key ? <Check size={12} /> : <Copy size={12} />} {copied === row.key ? t("explain.copied") : t("explain.copy")}
                                </button>
                                {canTask && (
                                  <button type="button" className="btn btn-sm" data-testid="check-to-task" disabled={busy !== null} onClick={() => void openDraft(open, row.index)}>
                                    <ListPlus size={12} /> {t("tasks.toTask")}
                                  </button>
                                )}
                                {/* Fehlalarm abhaken (#203) – Geheimnisse bewusst nicht */}
                                {canRun && open !== "secrets" && (
                                  <button type="button" className="btn btn-sm" data-testid="check-dismiss" disabled={busy !== null} onClick={() => void act("dismiss", { kind: open, index: row.index })} title={t("dismiss.hint")}>
                                    <EyeOff size={12} /> {t("dismiss.button")}
                                  </button>
                                )}
                              </div>
                            </details>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rows.length > shown && (
                    <button type="button" className="btn btn-sm mt-2 w-full" onClick={() => setShown((n) => n + PAGE)}>
                      {t("more", { n: rows.length - shown })}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      {draft && (
        <TaskDialog
          open
          task={null}
          initial={draft}
          onClose={() => setDraft(null)}
          onSave={async (form) => {
            const res = await api<{ task: { title: string } }>(`/api/projects/${projectId}/tasks`, { body: { ...form, recurrence: form.recurrence || null } });
            setNote(t("tasks.created", { title: res.task.title }));
            toast(t("tasks.created", { title: res.task.title }));
            router.refresh();
          }}
        />
      )}
      {note && (
        <p role="status" className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
