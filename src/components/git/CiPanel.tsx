"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, CheckCircle2, Circle, CircleDashed, ExternalLink, Expand, GitBranch, List, Loader2, MinusCircle, Maximize2, Minimize2, Minus, Pencil, Play, Plus, Save, Trash2, Upload, Workflow, X, XCircle, ZoomIn } from "lucide-react";
import { api, errorMessage } from "@/lib/client/api";
import { useFormat, useT } from "@/lib/i18n/client";
import { toast } from "@/components/ui/Toaster";
import { entryStepId, MAX_STEPS, newStep, nextStepId, STEP_KINDS, stepFlow, STEP_WHEN, type CiPipeline, type CiStep, type NodeState, type StepKind } from "@/lib/git/ciPipelineLogic";
import type { CiStatus, CiView } from "@/lib/git/ciPipeline";
import { cn } from "@/lib/utils";
import { useUnsavedWarning } from "@/lib/client/unsaved";

const STATE_ICON: Record<NodeState, React.ComponentType<{ size?: number; className?: string }>> = {
  idle: Circle,
  queued: CircleDashed,
  running: Loader2,
  success: CheckCircle2,
  failure: XCircle,
  skipped: MinusCircle,
};
const STATE_TONE: Record<NodeState, string> = {
  idle: "text-muted",
  queued: "text-amber-300",
  running: "animate-spin text-accent-ink",
  success: "text-emerald-400",
  failure: "text-red-400",
  skipped: "text-muted",
};
const SCHEDULES = { daily: "0 3 * * *", weekly: "0 3 * * 1" } as const;

/** Verweiskarte auf der Projektseite – der Editor lebt auf der eigenen CI-Seite. */
export function CiTeaser({ projectId }: { projectId: string }) {
  const t = useT("ci");
  return (
    <section id="ci" className="glass scroll-mt-24 p-6 sm:p-8" aria-labelledby="ci-heading" data-testid="ci">
      <h2 id="ci-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Workflow size={18} className="text-accent-ink" /> {t("title")}
      </h2>
      <p className="mt-1 mb-3 text-sm text-muted">{t("teaser")}</p>
      <Link href={`/projects/${projectId}/ci`} className="btn btn-primary btn-sm" data-testid="ci-open">
        <Workflow size={14} /> {t("openDesigner")}
      </Link>
    </section>
  );
}

/** CI-Designer (#107): Auslöser und Blöcke zusammenstellen, ins Repository schreiben, Lauf live verfolgen. */
export function CiPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const t = useT("ci");
  const f = useFormat();
  const [view, setView] = useState<CiView | null>(null);
  const [draft, setDraft] = useState<CiPipeline | null>(null);
  const [status, setStatus] = useState<CiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palette, setPalette] = useState<number | null>(null);
  const [pushText, setPushText] = useState("");
  const poll = useRef<number | null>(null);
  const restartPoll = useRef<() => void>(() => undefined);

  const apply = (v: CiView) => {
    setView(v);
    setDraft(v.pipeline);
    setPushText(v.pipeline.triggers.push.join(", "));
  };

  useEffect(() => {
    api<{ ci: CiView }>(`/api/projects/${projectId}/ci`)
      .then((r) => apply(r.ci))
      .catch((e) => setError(errorMessage(e)));
  }, [projectId]);

  const loadStatus = useCallback(async () => {
    try {
      const s = (await api<{ status: CiStatus }>(`/api/projects/${projectId}/ci/status`)).status;
      setStatus(s);
      return s;
    } catch {
      return null;
    }
  }, [projectId]);

  // Während ein Lauf aktiv ist: alle 5 s nachsehen, sonst jede Minute
  useEffect(() => {
    if (!view?.saved || !view.supported) return;
    let stopped = false;
    const tick = async () => {
      const s = await loadStatus();
      if (stopped) return;
      const active = s?.run && s.run.status !== "completed";
      poll.current = window.setTimeout(() => void tick(), active ? 5000 : 60_000);
    };
    restartPoll.current = () => {
      if (poll.current) window.clearTimeout(poll.current);
      void tick();
    };
    void tick();
    return () => {
      stopped = true;
      if (poll.current) window.clearTimeout(poll.current);
    };
  }, [view?.saved, view?.supported, loadStatus]);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const withPush = (p: CiPipeline): CiPipeline => ({
    ...p,
    triggers: { ...p.triggers, push: pushText.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean) },
  });

  const save = () =>
    run(async () => {
      if (!draft) return;
      apply((await api<{ ci: CiView }>(`/api/projects/${projectId}/ci`, { method: "PUT", body: { pipeline: withPush(draft) } })).ci);
      toast(t("saved"));
    });
  const publish = () =>
    run(async () => {
      const res = await api<{ result: "created" | "updated" | "current"; ci: CiView }>(`/api/projects/${projectId}/ci`, { body: { action: "publish" } });
      apply(res.ci);
      toast(t(`published_${res.result}`));
    });
  const start = () =>
    run(async () => {
      await api(`/api/projects/${projectId}/ci`, { body: { action: "run" } });
      toast(t("started"));
      // GitHub braucht einen Moment, bis der Lauf in der Liste steht – dann eng mitverfolgen
      window.setTimeout(() => restartPoll.current(), 3000);
    });

  const setSteps = (steps: CiStep[]) => draft && setDraft({ ...draft, steps });
  const patchStep = (i: number, patch: Partial<CiStep>) => draft && setSteps(draft.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.steps];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setSteps(next);
  };
  const insert = (at: number, kind: StepKind) => {
    if (!draft) return;
    const base = newStep(kind, kind === "custom" ? { run: "" } : kind === "npm-script" ? { script: "test", name: "npm test" } : {});
    // Namen eindeutig halten – die Live-Anzeige ordnet über den Namen zu
    let name = base.name;
    for (let n = 2; draft.steps.some((s) => s.name.toLowerCase() === name.toLowerCase()); n++) name = `${base.name} ${n}`;
    const next = [...draft.steps];
    next.splice(at, 0, { ...base, name });
    setSteps(next);
    setPalette(null);
  };

  // Eine halbfertige Pipeline ist schnell verloren – beim Weggehen fragen (#205)
  useUnsavedWarning(`ci-${projectId}`, Boolean(draft && view && JSON.stringify(withPush(draft)) !== JSON.stringify(view.pipeline)));

  const scheduleMode = !draft?.triggers.schedule ? "off" : draft.triggers.schedule === SCHEDULES.daily ? "daily" : draft.triggers.schedule === SCHEDULES.weekly ? "weekly" : "custom";
  const nodes = status?.nodes ?? {};

  // ── Node-Ansicht (n8n-artig): Steps als verbundene Kästchen, zoom- und verschiebbar ──
  const [canvasView, setCanvasView] = useState(true);
  // Vollbild der Node-Ansicht: echte Fullscreen-API auf dem Stage-Element – ohne
  // Browserleiste/Tastatur, zurück per Esc oder Knopf (wie im Codennetz).
  const [full, setFull] = useState(false);
  // Im Vollbild direkt am Node bearbeiten (vom Nutzer gewünscht): markierter Step
  const [editNode, setEditNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragNode, setDragNode] = useState<{ i: number; id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [layout, setLayout] = useState<Record<string, { x: number; y: number }>>({});
  const dragPan = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Zwei Finger zum Zoomen (#192): wie im Codennetz über native Listener, denn
  // React-Handler kommen zu spät, um das Zoomen der ganzen Seite zu verhindern.
  const pinch = useRef<{ dist: number; zoom: number; px: number; py: number; mx: number; my: number } | null>(null);
  const showCanvas = canvasView && draft && draft.steps.length > 0;
  // Auf schmalen Bildschirmen stehen die Blöcke untereinander (#192): nebeneinander
  // passen auf einem Handy kaum zwei, und alles wird winzig. Im Vollbild ist Platz
  // für die gewohnte Kette. Selbst verschobene Blöcke behalten ihren Platz.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  // Auch im Vollbild: ein hochkantes Handy bleibt schmal, untereinander passt mehr
  const stacked = narrow;
  // Nebeneinander beginnt die Kette weiter rechts: links davor steht der Start-Block (#202)
  const nodePos = (i: number, id: string) => layout[id] ?? (stacked ? { x: 20, y: 110 + i * 96 } : { x: 250 + i * 190, y: 96 });
  // Verbinden wie in n8n: Ausgang (Port) antippen, dann Ziel-Node antippen.
  // Die Kette bleibt dabei intakt – „verbinden“ heißt hier: den gewählten Step
  // direkt nach dem Ausgangs-Node einsortieren (GitHub führt strikt der Reihe aus).
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [nodeMenu, setNodeMenu] = useState<string | null>(null);
  const flow = draft ? stepFlow(draft.steps) : [];
  const mainId = draft ? entryStepId(draft.steps) : null;

  const insertAfter = (at: number, kind: StepKind) => {
    insert(at, kind);
    setNodeMenu(null);
    setLinkFrom(null);
  };
  // Ausgang gewählt: der zu verbindende Step wandert direkt hinter den Ausgang
  const linkTo = (targetId: string) => {
    if (!draft || !linkFrom || linkFrom === targetId) {
      setLinkFrom(null);
      return;
    }
    const fromIdx = draft.steps.findIndex((s) => s.id === linkFrom);
    const targetIdx = draft.steps.findIndex((s) => s.id === targetId);
    if (fromIdx < 0 || targetIdx < 0) {
      setLinkFrom(null);
      return;
    }
    const steps = [...draft.steps];
    const [moved] = steps.splice(targetIdx, 1);
    steps.splice(fromIdx + 1, 0, moved);
    setSteps(steps);
    setLinkFrom(null);
  };

  // Vollbild: Esc schließt, der Browser meldet das Ende über fullscreenchange
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    document.addEventListener("keydown", onKey);
    const onFsChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    try {
      const el = stageRef.current as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
      if (el?.requestFullscreen) void el.requestFullscreen().catch(() => {});
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {
      /* Vollbild verweigert – Overlay-Ansicht bleibt */
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFsChange);
      const doc = document as Document & { webkitExitFullscreen?: () => void };
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    };
  }, [full]);

  const onNodeDown = (i: number, id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = nodePos(i, id);
    setDragNode({ i, id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y });
  };
  // Antippen (kaum Bewegung) wählt den Node zum Bearbeiten – im Vollbild direkt am Kästchen
  const onNodeUp = (id: string, e: React.PointerEvent) => {
    const d = dragNode;
    setDragNode(null);
    if (d && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 6) setEditNode((cur) => (cur === id ? null : id));
  };
  const onNodeMove = (e: React.PointerEvent) => {
    if (!dragNode) return;
    const k = Math.max(0.4, zoom);
    setLayout((l) => ({ ...l, [dragNode.id]: { x: dragNode.ox + (e.clientX - dragNode.sx) / k, y: dragNode.oy + (e.clientY - dragNode.sy) / k } }));
  };
  const onStageDown = (e: React.PointerEvent) => {
    dragPan.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
  };
  const onStageMove = (e: React.PointerEvent) => {
    const d = dragPan.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) });
  };
  const stopDrag = () => {
    dragPan.current = null;
    setDragNode(null);
  };

  /**
   * Alles ins Bild holen (#192): Zoom und Verschiebung so setzen, dass jeder
   * Node sichtbar ist. Auf dem Handy passen sonst schon zwei Blöcke nicht
   * nebeneinander. Die selbst gewählte Anordnung bleibt dabei erhalten.
   */
  const fitView = () => {
    const stage = stageRef.current;
    if (!stage || !draft?.steps.length) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const NODE_W = 170;
    const NODE_H = 64;
    const points = draft.steps.map((s, i) => nodePos(i, s.id));
    // Links steht der Start-Node, unten die Beschriftung – dafür etwas Luft
    // Links (bzw. oben) steht der Start-Block – dafür Platz einrechnen
    const minX = Math.min(...points.map((p) => p.x)) - (stacked ? 20 : 230);
    const minY = Math.min(...points.map((p) => p.y)) - (stacked ? 100 : 40);
    const maxX = Math.max(...points.map((p) => p.x)) + NODE_W + 20;
    const maxY = Math.max(...points.map((p) => p.y)) + NODE_H + 20;
    const k = Math.min(1.4, Math.max(0.3, Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY))));
    setZoom(k);
    setPan({ x: (rect.width - (maxX - minX) * k) / 2 - minX * k, y: (rect.height - (maxY - minY) * k) / 2 - minY * k });
  };
  // Beim Öffnen des Vollbilds einmal einpassen – erst nach dem Umschalten,
  // sonst wird noch mit der alten Größe gerechnet
  const fitRef = useRef(fitView);
  fitRef.current = fitView;
  useEffect(() => {
    if (!full) return;
    const timer = setTimeout(() => fitRef.current(), 120);
    return () => clearTimeout(timer);
  }, [full]);
  // Und einmal, sobald die Ansicht das erste Mal Blöcke hat (#202): sonst lag
  // die Kette je nach Anordnung außerhalb und der Bereich sah leer aus.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !showCanvas) return;
    fitted.current = true;
    const timer = setTimeout(() => fitRef.current(), 150);
    return () => clearTimeout(timer);
  }, [showCanvas]);

  // Pinch-Zoom auf dem Handy (#192): zwei Finger vergrößern die Ansicht um den
  // Punkt zwischen ihnen. Native Listener mit preventDefault, sonst zoomt
  // Android die ganze Seite statt der Node-Ansicht.
  const zoomRef = useRef({ zoom, pan });
  zoomRef.current = { zoom, pan };
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !showCanvas) return;
    const middle = (t: TouchList) => {
      const r = stage.getBoundingClientRect();
      return {
        mx: (t[0].clientX + t[1].clientX) / 2 - r.left,
        my: (t[0].clientY + t[1].clientY) / 2 - r.top,
        dist: Math.max(1, Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)),
      };
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return;
      e.preventDefault();
      // Ein begonnenes Ziehen abbrechen – zwei Finger heißt zoomen
      dragPan.current = null;
      setDragNode(null);
      const { mx, my, dist } = middle(e.touches);
      const cur = zoomRef.current;
      pinch.current = { dist, zoom: cur.zoom, px: cur.pan.x, py: cur.pan.y, mx, my };
    };
    const onMove = (e: TouchEvent) => {
      const base = pinch.current;
      if (!base || e.touches.length !== 2) return;
      e.preventDefault();
      const { dist } = middle(e.touches);
      const next = Math.min(2, Math.max(0.4, base.zoom * (dist / base.dist)));
      const k = next / base.zoom;
      // Der Punkt zwischen den Fingern bleibt stehen, die Ansicht wächst darum herum
      setZoom(next);
      setPan({ x: base.mx - (base.mx - base.px) * k, y: base.my - (base.my - base.py) * k });
    };
    const onEnd = () => {
      pinch.current = null;
    };
    stage.addEventListener("touchstart", onStart, { passive: false });
    stage.addEventListener("touchmove", onMove, { passive: false });
    stage.addEventListener("touchend", onEnd);
    stage.addEventListener("touchcancel", onEnd);
    return () => {
      stage.removeEventListener("touchstart", onStart);
      stage.removeEventListener("touchmove", onMove);
      stage.removeEventListener("touchend", onEnd);
      stage.removeEventListener("touchcancel", onEnd);
    };
  }, [showCanvas]);
  // Als Funktion, nicht als Komponente – sonst hängt React die Knöpfe bei jedem Rendern neu ein
  const inserter = (at: number) =>
    canEdit && draft && draft.steps.length < MAX_STEPS ? (
      <div className="py-1">
        <div className="relative flex justify-center">
          <span className="absolute inset-y-0 left-1/2 w-px bg-fg/15" aria-hidden />
          <button type="button" className="btn btn-ghost btn-icon btn-sm relative z-10 bg-bg" onClick={() => setPalette(palette === at ? null : at)} aria-label={t("addHere")} title={t("addHere")} aria-expanded={palette === at} data-testid="ci-insert">
            <Plus size={13} />
          </button>
        </div>
        {/* Im Ablauf statt schwebend – sonst verdeckt der nächste Abschnitt die Auswahl */}
        {palette === at && (
          <div className="mt-1 grid gap-1 rounded-xl border border-accent/40 bg-accent/5 p-2 text-sm sm:grid-cols-2" data-testid="ci-palette">
            {STEP_KINDS.map((k) => (
              <button key={k} type="button" className="rounded-lg px-2 py-1 text-left hover:bg-fg/10" onClick={() => insert(at, k)} data-kind={k}>
                <span className="font-medium">{t(`kinds.${k}`)}</span>
                <span className="block text-xs text-muted">{t(`kindHints.${k}`)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="flex justify-center py-1" aria-hidden>
        <span className="h-4 w-px bg-fg/15" />
      </div>
    );

  // Vollbild per Portal: im Glas-Panel (backdrop-filter) bliebe „fixed“ im Panel gefangen
  const inStage = (el: React.ReactNode) => (full && typeof document !== "undefined" ? createPortal(el, document.body) : el);

  return (
    <section id="ci" className="glass scroll-mt-24 p-6 sm:p-8" aria-labelledby="ci-heading" data-testid="ci">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h2 id="ci-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Workflow size={18} className="text-accent-ink" /> {t("title")}
        </h2>
        {status?.run && (
          <a href={status.run.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted hover:text-accent-ink" data-testid="ci-run" data-status={status.run.status} suppressHydrationWarning>
            {t("lastRun", { status: status.run.status === "completed" ? t(`state.${status.run.conclusion === "success" ? "success" : "failure"}`) : t(`runStatus.${(["queued", "in_progress", "waiting", "requested", "pending"].includes(status.run.status) ? status.run.status : "completed") as "queued"}`), when: f.ago(status.run.startedAt) })}
            <ExternalLink size={11} />
          </a>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">{t("description")}</p>
      {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!view && !error && <div className="h-24 animate-pulse rounded-xl bg-fg/5" />}
      {view && !view.supported && <p className="text-sm text-muted">{t("githubOnly")}</p>}

      {view && view.supported && draft && (
        <div className="space-y-4">
          <p className="text-xs" data-testid="ci-state" suppressHydrationWarning>
            {!view.saved ? (
              <span className="text-amber-300">{t("suggested")}</span>
            ) : view.unpublished ? (
              <span className="text-amber-300">{t("unpublished")}</span>
            ) : view.publishedAt ? (
              <span className="text-emerald-400">{t("published", { when: f.ago(view.publishedAt), by: view.publishedBy ?? "?" })}</span>
            ) : null}
            {!view.hasToken && <span className="ml-2 text-red-400">{t("noToken")}</span>}
          </p>

          <fieldset className="grid gap-3 rounded-2xl border p-3 text-sm sm:grid-cols-2" disabled={!canEdit} data-testid="ci-triggers">
            <legend className="px-1 text-xs font-semibold text-muted">{t("triggers.title")}</legend>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-muted">{t("triggers.push")}</span>
              <input className="field font-mono text-xs" value={pushText} onChange={(e) => setPushText(e.target.value)} placeholder={t("triggers.pushPlaceholder")} data-testid="ci-push" />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.triggers.pullRequest} onChange={(e) => setDraft({ ...draft, triggers: { ...draft.triggers, pullRequest: e.target.checked } })} />
              {t("triggers.pullRequest")}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.triggers.manual} onChange={(e) => setDraft({ ...draft, triggers: { ...draft.triggers, manual: e.target.checked } })} data-testid="ci-manual" />
              {t("triggers.manual")}
            </label>
            <label>
              <span className="mb-1 block text-xs text-muted">{t("triggers.schedule")}</span>
              <select
                className="field"
                value={scheduleMode}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ ...draft, triggers: { ...draft.triggers, schedule: v === "off" ? null : v === "custom" ? (draft.triggers.schedule ?? "30 2 * * *") : SCHEDULES[v as keyof typeof SCHEDULES] } });
                }}
                data-testid="ci-schedule"
              >
                <option value="off">{t("triggers.scheduleOff")}</option>
                <option value="daily">{t("triggers.daily")}</option>
                <option value="weekly">{t("triggers.weekly")}</option>
                <option value="custom">{t("triggers.custom")}</option>
              </select>
            </label>
            {scheduleMode === "custom" ? (
              <label>
                <span className="mb-1 block text-xs text-muted">{t("triggers.cron")}</span>
                <input className="field font-mono text-xs" value={draft.triggers.schedule ?? ""} onChange={(e) => setDraft({ ...draft, triggers: { ...draft.triggers, schedule: e.target.value } })} data-testid="ci-cron" />
              </label>
            ) : (
              <label>
                <span className="mb-1 block text-xs text-muted">{t("triggers.timeout")}</span>
                <input type="number" min={1} max={120} className="field" value={draft.timeoutMinutes} onChange={(e) => setDraft({ ...draft, timeoutMinutes: Math.max(1, Math.min(120, Number(e.target.value) || 20)) })} />
              </label>
            )}
          </fieldset>

          {showCanvas && inStage(
            <div ref={stageRef} className={cn("relative overflow-hidden rounded-2xl border bg-bg/40", full && "fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden rounded-none border-0 p-3 sm:p-4")} data-testid="ci-canvas">
              {/* Auswahl der Block-Arten, sichtbar über der Leinwand (#202) */}
              {palette !== null && canEdit && (
                <div className="absolute left-2 top-2 z-20 grid max-h-[70%] w-[min(22rem,80%)] gap-1 overflow-y-auto rounded-xl border border-accent/40 bg-bg/95 p-2 text-sm shadow-xl" data-testid="ci-canvas-palette">
                  {STEP_KINDS.map((k) => (
                    <button key={k} type="button" className="rounded-lg px-2 py-1 text-left hover:bg-fg/10" onClick={() => insert(palette, k)} data-kind={k}>
                      <span className="font-medium">{t(`kinds.${k}`)}</span>
                      <span className="block text-xs text-muted">{t(`kindHints.${k}`)}</span>
                    </button>
                  ))}
                </div>
              )}
              {/* Werkzeugleiste: Ansicht umschalten, zoomen, Vollbild, einpassen */}
              <div className="absolute right-2 top-2 z-10 flex max-w-[75%] flex-wrap justify-end gap-1">
                {/* Block hinzufügen direkt in der Node-Ansicht (#202) – die Liste darunter bleibt zu */}
                {canEdit && draft.steps.length < MAX_STEPS && (
                  <button type="button" className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9" onClick={() => setPalette(palette === draft.steps.length ? null : draft.steps.length)} aria-label={t("addHere")} title={t("addHere")} aria-expanded={palette === draft.steps.length} data-testid="ci-canvas-add">
                    <Plus size={16} />
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9" onClick={() => { setFull(false); setCanvasView(false); }} aria-label={t("canvasOff")} title={t("canvasOff")} data-testid="ci-canvas-off">
                  <List size={16} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9" onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))} aria-label={t("zoomIn")} title={t("zoomIn")} data-testid="ci-zoom-in">
                  <ZoomIn size={16} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} aria-label={t("zoomOut")} title={t("zoomOut")} data-testid="ci-zoom-out">
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9"
                  onClick={fitView}
                  aria-label={t("fit")}
                  title={t("fit")}
                  data-testid="ci-fit"
                >
                  <Maximize2 size={16} />
                </button>
                <button type="button" className="btn btn-ghost btn-icon h-8 w-8 bg-bg sm:h-9 sm:w-9" onClick={() => setFull((v) => !v)} aria-label={full ? t("exitFullscreen") : t("fullscreen")} title={full ? t("exitFullscreen") : t("fullscreen")} data-testid="ci-fullscreen">
                  {full ? <Minimize2 size={16} /> : <Expand size={16} />}
                </button>
                {full && canEdit && (
                  <button type="button" className="btn btn-sm bg-bg !px-2 !py-1 text-xs" disabled={busy} onClick={() => void save()} data-testid="ci-canvas-save">
                    <Save size={13} /> {t("save")}
                  </button>
                )}
              </div>
              <div
                className={cn("cursor-grab touch-none select-none active:cursor-grabbing", full ? "min-h-0 flex-1" : "h-72 sm:h-80")}
                onPointerDown={onStageDown}
                onPointerMove={(e) => {
                  onStageMove(e);
                  onNodeMove(e);
                }}
                onPointerUp={stopDrag}
                onPointerLeave={stopDrag}
              >
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", width: "1600px", height: "320px" }} className="relative">
                  {/* Start-Node (Main): wo die Pipeline beginnt – Auslöser stehen darunter */}
                  {mainId && (() => {
                    const p = nodePos(0, mainId);
                    // Untereinander steht der Start darüber, sonst links daneben
                    const mx = stacked ? p.x + 20 : Math.max(0, p.x - 210);
                    const my = stacked ? Math.max(0, p.y - 96) : p.y + 30 - 24;
                    return (
                      <div className="absolute w-[130px] rounded-xl border-2 border-dashed border-accent/50 bg-accent/5 p-2 text-center shadow-lg" style={{ left: mx, top: my }} data-testid="ci-canvas-main" title={t("mainNodeHint")}>
                        <Workflow size={16} className="mx-auto text-accent-ink" />
                        <p className="mt-1 text-xs font-semibold">{t("mainNode")}</p>
                        <p className="text-[10px] leading-tight text-muted">{t("mainNodeHint")}</p>
                      </div>
                    );
                  })()}
                  {/* Verbindungen zwischen aufeinanderfolgenden Steps */}
                  <svg className={cn("absolute inset-0 h-full w-full", linkFrom ? "pointer-events-none" : "pointer-events-none")} aria-hidden>
                    {/* Vom Start zum ersten Block – sonst hängt der Start-Kasten lose daneben (#202) */}
                    {mainId && (() => {
                      const p = nodePos(0, mainId);
                      const sx = stacked ? p.x + 85 : Math.max(0, p.x - 210) + 130;
                      const sy = stacked ? Math.max(0, p.y - 96) + 76 : p.y + 30;
                      const ex = stacked ? p.x + 85 : p.x;
                      const ey = stacked ? p.y : p.y + 30;
                      const d = stacked ? `M ${sx} ${sy} C ${sx} ${sy + 20}, ${ex} ${ey - 20}, ${ex} ${ey}` : `M ${sx} ${sy} C ${sx + 30} ${sy}, ${ex - 30} ${ey}, ${ex} ${ey}`;
                      return <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} strokeDasharray="4 3" className="text-accent-ink" data-testid="ci-edge-start" />;
                    })()}
                    {flow.map((e) => {
                      const iFrom = draft.steps.findIndex((s) => s.id === e.from);
                      const iTo = draft.steps.findIndex((s) => s.id === e.to);
                      if (iFrom < 0 || iTo < 0) return null;
                      const a = nodePos(iFrom, e.from);
                      const b = nodePos(iTo, e.to);
                      // Untereinander: von unten nach oben verbinden, sonst von rechts nach links.
                      // Breite je nach Zustand – ein Block im Bearbeiten-Modus ist breiter (#202)
                      const breite = editNode === e.from ? 256 : 170;
                      const x1 = stacked ? a.x + breite / 2 : a.x + breite,
                        y1 = stacked ? a.y + 62 : a.y + 30,
                        x2 = stacked ? b.x + (editNode === e.to ? 128 : 85) : b.x,
                        y2 = stacked ? b.y : b.y + 30;
                      const curve = stacked ? `M ${x1} ${y1} C ${x1} ${y1 + 24}, ${x2} ${y2 - 24}, ${x2} ${y2}` : `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`;
                      const state = nodes[e.to] ?? "idle";
                      return <path key={`${e.from}-${e.to}`} d={curve} fill="none" stroke={state === "running" ? "var(--vw-accent, #a78bfa)" : "currentColor"} strokeOpacity={state === "running" ? 0.9 : 0.25} strokeWidth={state === "running" ? 2.5 : 1.5} className="text-fg" data-testid="ci-edge" data-state={state} />;
                    })}
                  </svg>
                  {draft.steps.map((s, i) => {
                    const state = nodes[s.id] ?? "idle";
                    const Icon = STATE_ICON[state];
                    const p = nodePos(i, s.id);
                    const isMain = s.id === mainId;
                    const isLinkTarget = Boolean(linkFrom && linkFrom !== s.id);
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          // touch-none: sonst wertet Android das Ziehen am Node als Wischen und bricht es ab (#192)
                          "absolute w-[170px] cursor-grab touch-none rounded-xl border bg-bg p-2 shadow-lg active:cursor-grabbing",
                          state === "running" && "border-accent/70 shadow-accent/20",
                          state === "failure" && "border-red-500/60",
                          state === "success" && "border-emerald-500/50",
                          editNode === s.id && "z-20 w-64 ring-2 ring-accent",
                          isMain && "border-accent/60",
                          isLinkTarget && "ring-2 ring-accent/60",
                        )}
                        style={{ left: p.x, top: p.y }}
                        onPointerDown={(e) => (linkFrom ? e.stopPropagation() : onNodeDown(i, s.id, e))}
                        onPointerUp={(e) => (linkFrom ? (e.stopPropagation(), linkTo(s.id)) : onNodeUp(s.id, e))}
                        data-testid="ci-canvas-node"
                        data-kind={s.kind}
                        data-state={state}
                      >
                        <div className="flex items-center gap-1.5">
                          {isMain && <GitBranch size={14} className="shrink-0 text-accent-ink" />}
                          <Icon size={14} className={cn("shrink-0", STATE_TONE[state])} />
                          <span className="min-w-0 truncate text-xs font-medium" title={s.name}>
                            {s.name}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              // 28px statt 16: mit dem Finger sonst kaum zu treffen (#192)
                              className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-fg/10 hover:text-fg"
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => {
                                e.stopPropagation();
                                setNodeMenu((m) => (m === s.id ? null : s.id));
                                setEditNode(null);
                              }}
                              aria-label={t("nodeMenu")}
                              title={t("nodeMenu")}
                              data-testid="ci-node-menu-btn"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-muted">{t(`kinds.${s.kind}`)}</p>
                        {/* Ausgang (Port): antippen, dann Ziel-Node antippen – sortiert ihn direkt dahinter */}
                        {canEdit && draft.steps.length > 1 && (
                          <button
                            type="button"
                            className={cn(
                              // 28px: genauso groß wie der Menü-Knopf, damit beide mit dem Finger sicher treffbar sind (#192)
                              "absolute -right-3 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full border-2 bg-bg shadow",
                              linkFrom === s.id ? "border-accent bg-accent/20" : "border-fg/30 hover:border-accent",
                            )}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              setLinkFrom((cur) => (cur === s.id ? null : s.id));
                              setEditNode(null);
                              setNodeMenu(null);
                            }}
                            aria-label={linkFrom === s.id ? t("linkCancel") : t("linkFrom")}
                            title={linkFrom === s.id ? t("linkCancel") : t("linkFrom")}
                            data-testid="ci-node-port"
                          />
                        )}
                        {nodeMenu === s.id && canEdit && (
                          <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border bg-bg p-1 text-xs shadow-xl" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} data-testid="ci-node-menu">
                            <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/10" onClick={() => { setEditNode(s.id); setNodeMenu(null); }}>
                              <Pencil size={12} /> {t("editNode")}
                            </button>
                            {draft.steps.length < MAX_STEPS && (
                              <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/10" onClick={() => { setPalette(i + 1); setNodeMenu(null); }}>
                                <Plus size={12} /> {t("insertAfterNode")}
                              </button>
                            )}
                            {i > 0 && (
                              <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/10" onClick={() => { move(i, -1); setNodeMenu(null); }}>
                                <ArrowUp size={12} /> {t("up")}
                              </button>
                            )}
                            {i < draft.steps.length - 1 && (
                              <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/10" onClick={() => { move(i, 1); setNodeMenu(null); }}>
                                <ArrowDown size={12} /> {t("down")}
                              </button>
                            )}
                            {draft.steps.length > 1 && (
                              <button type="button" className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-fg/10 hover:text-red-400" onClick={() => { setSteps(draft.steps.filter((_, j) => j !== i)); setNodeMenu(null); setEditNode(null); }}>
                                <Trash2 size={12} /> {t("remove")}
                              </button>
                            )}
                          </div>
                        )}
                        {linkFrom === s.id && (
                          <p className="mt-1 rounded-lg bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent-ink">{t("linkWaiting")}</p>
                        )}
                        {editNode === s.id && canEdit && (
                          <div className="mt-2 space-y-1.5 border-t border-fg/10 pt-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                            <label className="block text-[10px] leading-snug text-muted">
                              {t("name")}
                              <input className="field mt-0.5 !py-0.5 text-xs" value={s.name} maxLength={60} onChange={(e) => patchStep(i, { name: e.target.value })} aria-label={t("name")} data-testid="ci-node-name" />
                            </label>
                            <label className="block text-[10px] leading-snug text-muted">
                              {t("when")}
                              <select className="field mt-0.5 !py-0.5 text-xs" value={s.when} onChange={(e) => patchStep(i, { when: e.target.value as CiStep["when"] })} aria-label={t("when")}>
                                {STEP_WHEN.map((w) => (
                                  <option key={w} value={w}>
                                    {t(`whenOptions.${w}`)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {s.kind === "npm-script" && (
                              <label className="block text-[10px] leading-snug text-muted">
                                {t("script")}
                                <input className="field mt-0.5 !py-0.5 font-mono text-xs" value={s.script ?? ""} onChange={(e) => patchStep(i, { script: e.target.value })} aria-label={t("script")} />
                              </label>
                            )}
                            {(s.kind === "node-install" || s.kind === "python-install" || s.kind === "go-test") && (
                              <label className="block text-[10px] leading-snug text-muted">
                                {t("version")}
                                <input className="field mt-0.5 !py-0.5 font-mono text-xs" value={s.version ?? ""} onChange={(e) => patchStep(i, { version: e.target.value || undefined })} placeholder={s.kind === "node-install" ? "22" : s.kind === "python-install" ? "3.12" : "stable"} aria-label={t("version")} />
                              </label>
                            )}
                            {s.kind === "custom" && (
                              <textarea
                                className="field min-h-16 !py-0.5 font-mono text-xs"
                                value={s.run ?? ""}
                                onChange={(e) => patchStep(i, { run: e.target.value })}
                                placeholder={"npm run e2e\n./scripts/check.sh"}
                                aria-label={t("run")}
                                spellCheck={false}
                              />
                            )}
                            <div className="flex items-center justify-between gap-1">
                              <label className="flex min-w-0 items-center gap-1 text-[10px] leading-snug text-muted">
                                <input type="checkbox" className="shrink-0" checked={s.continueOnError} onChange={(e) => patchStep(i, { continueOnError: e.target.checked })} />
                                <span className="min-w-0">{t("continueOnError")}</span>
                              </label>
                              <button type="button" className="btn btn-ghost btn-icon h-6 w-6 shrink-0" onClick={() => setEditNode(null)} aria-label={t("closeEdit")} title={t("closeEdit")} data-testid="ci-node-close">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                        {state === "running" && (
                          <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-full bg-fg/10">
                            <span className="block h-full w-1/3 animate-[vw-canvas-run_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className={cn("border-t px-3 py-1 text-[11px] text-muted", full && "shrink-0")}>{linkFrom ? <span className="font-medium text-accent-ink">{t("linkHint")}</span> : t("canvasHint")}</p>
            </div>,
          )}

          {/* Nicht zweimal dasselbe (#202): Solange die Node-Ansicht läuft, bleibt
              die Liste weg – bearbeiten lässt sich alles direkt am Block. */}
          <div data-testid="ci-steps" className={cn(showCanvas && "hidden")}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted">{t("steps")}</p>
              {draft.steps.length > 0 && !canvasView && (
                <button type="button" className="btn btn-sm !py-1 text-xs" onClick={() => setCanvasView(true)} data-testid="ci-canvas-on">
                  <Expand size={13} /> {t("canvasOn")}
                </button>
              )}
            </div>
            {inserter(0)}
            {draft.steps.map((s, i) => {
              const state = nodes[s.id] ?? "idle";
              const Icon = STATE_ICON[state];
              return (
                <div key={s.id}>
                  <div className={cn("rounded-2xl border bg-bg/30 p-3 transition-colors", state === "running" && "border-accent/60", state === "failure" && "border-red-500/50", state === "success" && "border-emerald-500/40")} data-testid="ci-node" data-kind={s.kind} data-state={state}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon size={18} className={cn("shrink-0", STATE_TONE[state])} />
                      <span className="sr-only">{t(`state.${state}`)}</span>
                      <input className="field w-auto min-w-0 flex-1 !py-1 font-medium" value={s.name} maxLength={60} disabled={!canEdit} onChange={(e) => patchStep(i, { name: e.target.value })} aria-label={t("name")} />
                      <span className="chip !py-0.5 text-[11px]">{t(`kinds.${s.kind}`)}</span>
                      {canEdit && (
                        <span className="flex gap-0.5">
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("up")} title={t("up")}>
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm" disabled={i === draft.steps.length - 1} onClick={() => move(i, 1)} aria-label={t("down")} title={t("down")}>
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon btn-sm hover:text-red-400" disabled={draft.steps.length <= 1} onClick={() => setSteps(draft.steps.filter((_, j) => j !== i))} aria-label={t("remove")} title={t("remove")} data-testid="ci-remove">
                            <Trash2 size={13} />
                          </button>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">{t(`kindHints.${s.kind}`)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <label className="flex items-center gap-1">
                        {t("when")}
                        <select className="field w-auto !py-0.5 text-xs" value={s.when} disabled={!canEdit} onChange={(e) => patchStep(i, { when: e.target.value as CiStep["when"] })}>
                          {STEP_WHEN.map((w) => (
                            <option key={w} value={w}>
                              {t(`whenOptions.${w}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {s.kind === "npm-script" && (
                        <label className="flex items-center gap-1">
                          {t("script")}
                          <input className="field w-28 !py-0.5 font-mono text-xs" value={s.script ?? ""} disabled={!canEdit} onChange={(e) => patchStep(i, { script: e.target.value })} />
                        </label>
                      )}
                      {(s.kind === "node-install" || s.kind === "python-install" || s.kind === "go-test") && (
                        <label className="flex items-center gap-1">
                          {t("version")}
                          <input className="field w-20 !py-0.5 font-mono text-xs" value={s.version ?? ""} disabled={!canEdit} onChange={(e) => patchStep(i, { version: e.target.value || undefined })} placeholder={s.kind === "node-install" ? "22" : s.kind === "python-install" ? "3.12" : "stable"} />
                        </label>
                      )}
                      <label className="flex items-center gap-1">
                        <input type="checkbox" checked={s.continueOnError} disabled={!canEdit} onChange={(e) => patchStep(i, { continueOnError: e.target.checked })} />
                        {t("continueOnError")}
                      </label>
                    </div>
                    {s.kind === "custom" && (
                      <textarea
                        className="field mt-2 min-h-20 font-mono text-xs"
                        value={s.run ?? ""}
                        disabled={!canEdit}
                        onChange={(e) => patchStep(i, { run: e.target.value })}
                        placeholder={"npm run e2e\n./scripts/check.sh"}
                        aria-label={t("run")}
                        spellCheck={false}
                        data-testid="ci-run-script"
                      />
                    )}
                  </div>
                  {inserter(i + 1)}
                </div>
              );
            })}
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void save()} data-testid="ci-save">
                <Save size={14} /> {t("save")}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || !view.saved || !view.hasToken} onClick={() => void publish()} data-testid="ci-publish">
                <Upload size={14} /> {t("publish")}
              </button>
              <button type="button" className="btn btn-sm" disabled={busy || !view.publishedAt || !view.pipeline.triggers.manual} onClick={() => void start()} data-testid="ci-start">
                <Play size={14} /> {t("run_")}
              </button>
            </div>
          )}

          <details className="rounded-2xl border px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium">
              {t("yaml")} <code className="text-muted">{view.path}</code>
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre rounded-lg bg-black/30 p-3 font-mono text-[11px]" data-testid="ci-yaml">
              {view.yaml}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}
