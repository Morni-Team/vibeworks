"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bold,
  ChevronRight,
  Code,
  Columns2,
  Eye,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  PencilLine,
  Plus,
  Quote,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { BoardCanvas } from "./BoardCanvas";
import { docIcon } from "@/lib/docs/kinds";
import type { DocDetail, DocTreeItem } from "@/lib/docs";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { useFormat, useT } from "@/lib/i18n/client";

type Mode = "write" | "split" | "preview";
type SaveState = "saved" | "dirty" | "saving" | "error";

const MODE_KEY = "vw.docs.mode";
const EMOJIS = ["📄", "📝", "💡", "📚", "🧠", "🚀", "🛠️", "⚙️", "🎯", "📌", "🗂️", "🔖", "🌐", "💻", "🧪", "🎨", "📈", "🗓️", "✅", "❤️", "⭐", "🔥", "🌱", "🔒"];

/** Markdown-Hilfen für die Werkzeugleiste. */
function wrapSelection(value: string, start: number, end: number, before: string, after: string, placeholder: string) {
  const selected = value.slice(start, end) || placeholder;
  return { value: value.slice(0, start) + before + selected + after + value.slice(end), selStart: start + before.length, selEnd: start + before.length + selected.length };
}
function prefixLines(value: string, start: number, end: number, prefix: string) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const block = value.slice(lineStart, end || start);
  const replaced = block.split("\n").map((l) => prefix + l).join("\n");
  return { value: value.slice(0, lineStart) + replaced + value.slice(end || start), selStart: start + prefix.length, selEnd: (end || start) + prefix.length * block.split("\n").length };
}

export function DocEditor({
  doc,
  tree,
  onSaved,
  onCreateChild,
}: {
  doc: DocDetail;
  tree: DocTreeItem[];
  onSaved: (item: DocTreeItem) => void;
  onCreateChild: () => void;
}) {
  const t = useT("docs");
  const f = useFormat();
  // Eine Leinwand speichert JSON statt Markdown – Kopf, Automatik und Baum sind dieselben.
  const isBoard = doc.kind === "BOARD";
  const [title, setTitle] = useState(doc.title);
  const [icon, setIcon] = useState(doc.icon);
  const [content, setContent] = useState(doc.content);
  const [mode, setMode] = useState<Mode>("write");
  const [state, setState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState(doc.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // ── Automatisches Speichern ─────────────────────────────
  const latest = useRef({ title, icon, content });
  latest.current = { title, icon, content };
  const lastSaved = useRef(JSON.stringify({ title: doc.title, icon: doc.icon, content: doc.content }));
  const inFlight = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveRef.current(), 800);
  }, []);

  saveRef.current = async () => {
    const snapshot = { ...latest.current, title: latest.current.title.trim() || t("editor.untitled") };
    const json = JSON.stringify(latest.current);
    if (json === lastSaved.current) {
      setState("saved");
      return;
    }
    if (inFlight.current) {
      schedule();
      return;
    }
    inFlight.current = true;
    setState("saving");
    try {
      const res = await api<{ doc: DocDetail; item: DocTreeItem }>(`/api/docs/${doc.id}`, { method: "PATCH", body: snapshot });
      lastSaved.current = json;
      setSavedAt(res.doc.updatedAt);
      setError(null);
      onSaved(res.item);
      if (JSON.stringify(latest.current) !== json) {
        setState("dirty");
        schedule();
      } else {
        setState("saved");
      }
    } catch (e) {
      setState("error");
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  };

  const change = (patch: Partial<typeof latest.current>) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.icon !== undefined) setIcon(patch.icon);
    if (patch.content !== undefined) setContent(patch.content);
    latest.current = { ...latest.current, ...patch };
    setState("dirty");
    schedule();
  };

  // Beim Verlassen der Seite (Wechsel im Baum) noch Ungespeichertes sichern.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (JSON.stringify(latest.current) !== lastSaved.current) void saveRef.current();
    },
    [],
  );
  useEffect(() => {
    if (state !== "dirty" && state !== "saving" && state !== "error") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY) as Mode | null;
      if (m === "write" || m === "split" || m === "preview") setMode(m);
      else if (window.innerWidth >= 1024) setMode("split");
    } catch {
      /* egal */
    }
  }, []);
  const chooseMode = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* egal */
    }
  };

  // ── Werkzeugleiste ──────────────────────────────────────
  function format(kind: "bold" | "italic" | "h2" | "list" | "check" | "quote" | "code" | "link") {
    const ta = textarea.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const r =
      kind === "bold" ? wrapSelection(content, s, e, "**", "**", t("editor.samples.bold"))
      : kind === "italic" ? wrapSelection(content, s, e, "_", "_", t("editor.samples.italic"))
      : kind === "code" ? (content.slice(s, e).includes("\n") ? wrapSelection(content, s, e, "```\n", "\n```", t("editor.samples.code")) : wrapSelection(content, s, e, "`", "`", t("editor.samples.code")))
      : kind === "link" ? wrapSelection(content, s, e, "[", "](https://)", t("editor.samples.link"))
      : kind === "h2" ? prefixLines(content, s, e, "## ")
      : kind === "list" ? prefixLines(content, s, e, "- ")
      : kind === "check" ? prefixLines(content, s, e, "- [ ] ")
      : prefixLines(content, s, e, "> ");
    change({ content: r.value });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(r.selStart, r.selEnd);
    });
  }

  // ── Brotkrumen und Unterseiten ──────────────────────────
  const byId = useMemo(() => new Map(tree.map((t) => [t.id, t])), [tree]);
  const path: DocTreeItem[] = [];
  for (let p = doc.parentId ? byId.get(doc.parentId) : undefined; p && path.length < 20; p = p.parentId ? byId.get(p.parentId) : undefined) path.unshift(p);
  const children = tree.filter((d) => d.parentId === doc.id).sort((a, b) => a.position - b.position);

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const tools = [
    { k: "bold" as const, icon: Bold, label: t("editor.tools.bold") },
    { k: "italic" as const, icon: Italic, label: t("editor.tools.italic") },
    { k: "h2" as const, icon: Heading2, label: t("editor.tools.h2") },
    { k: "list" as const, icon: List, label: t("editor.tools.list") },
    { k: "check" as const, icon: ListChecks, label: t("editor.tools.check") },
    { k: "quote" as const, icon: Quote, label: t("editor.tools.quote") },
    { k: "code" as const, icon: Code, label: t("editor.tools.code") },
    { k: "link" as const, icon: Link2, label: t("editor.tools.link") },
  ];

  const stateText =
    state === "saving" ? t("editor.state.saving") : state === "dirty" ? t("editor.state.dirty") : state === "error" ? t("editor.state.error") : t("editor.state.saved", { ago: f.ago(savedAt) });

  return (
    <article className="glass flex min-h-[70vh] flex-col p-5 sm:p-7">
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted" aria-label={t("editor.breadcrumb")}>
        <Link href="/docs" className="hover:text-fg">{t("tree.title")}</Link>
        {path.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1">
            <ChevronRight size={12} />
            <Link href={`/docs/${p.id}`} className="max-w-40 truncate hover:text-fg">{docIcon(p)} {p.title}</Link>
          </span>
        ))}
      </nav>

      <div className="flex items-start gap-3">
        <div className="relative">
          <button type="button" onClick={() => setEmojiOpen((o) => !o)} className="flex h-12 w-12 items-center justify-center rounded-xl text-3xl hover:bg-fg/10" aria-label={t("editor.chooseIcon")} title={t("editor.chooseIcon")}>
            {docIcon({ icon, kind: doc.kind })}
          </button>
          {emojiOpen && (
            <div className="glass-strong fade-in absolute left-0 top-14 z-30 grid w-64 grid-cols-8 gap-1 p-2">
              {EMOJIS.map((e) => (
                <button key={e} type="button" className="rounded p-1 text-xl hover:bg-fg/10" onClick={() => { change({ icon: e }); setEmojiOpen(false); }}>{e}</button>
              ))}
              <button type="button" className="col-span-8 mt-1 rounded px-2 py-1 text-xs text-muted hover:bg-fg/10" onClick={() => { change({ icon: null }); setEmojiOpen(false); }}>{t("editor.noIcon")}</button>
            </div>
          )}
        </div>
        <input
          className="min-w-0 flex-1 bg-transparent py-1.5 text-3xl font-bold tracking-tight outline-none placeholder:text-muted/60"
          value={title}
          onChange={(e) => change({ title: e.target.value })}
          placeholder={t("editor.untitled")}
          maxLength={200}
          aria-label={t("editor.titleLabel")}
        />
      </div>

      <div className={cn("mt-4 flex flex-wrap items-center gap-2 border-y py-2", isBoard && "hidden")}>
        <div className="flex flex-wrap gap-0.5" role="toolbar" aria-label={t("editor.toolbar")}>
          {tools.map((tool) => (
            <button key={tool.k} type="button" className="rounded-md p-1.5 text-muted hover:bg-fg/10 hover:text-fg disabled:opacity-40" onClick={() => format(tool.k)} title={tool.label} aria-label={tool.label} disabled={mode === "preview"}>
              <tool.icon size={16} />
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label={t("editor.view")} className="ml-auto flex rounded-lg border bg-bg/40 p-0.5">
          {([
            ["write", PencilLine, t("editor.modes.write")],
            ["split", Columns2, t("editor.modes.split")],
            ["preview", Eye, t("editor.modes.preview")],
          ] as const).map(([m, Icon, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              title={label}
              aria-label={label}
              onClick={() => chooseMode(m)}
              className={cn("rounded-md px-2 py-1", mode === m ? "bg-accent text-on-accent" : "text-muted hover:text-fg", m === "split" && "hidden lg:block")}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {isBoard ? (
        <div className="mt-4 flex-1">
          <BoardCanvas value={content} onChange={(v) => change({ content: v })} />
        </div>
      ) : (
      <div className={cn("mt-4 grid flex-1 gap-5", mode === "split" && "lg:grid-cols-2")}>
        {mode !== "preview" && (
          <textarea
            ref={textarea}
            className="min-h-[55vh] w-full resize-y rounded-xl border bg-bg/30 p-4 font-mono text-[0.8125rem] leading-relaxed outline-none focus:border-accent"
            value={content}
            onChange={(e) => change({ content: e.target.value })}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                window.clearTimeout(timer.current);
                void saveRef.current();
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                format("bold");
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
                e.preventDefault();
                format("italic");
              }
            }}
            placeholder={t("editor.contentPlaceholder")}
            aria-label={t("editor.contentLabel")}
            spellCheck
          />
        )}
        {mode !== "write" && (
          <div className={cn("min-w-0 overflow-auto rounded-xl", mode === "split" && "border p-4 lg:max-h-[75vh]")}>
            {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-sm text-muted">{t("editor.emptyPreview")}</p>}
          </div>
        )}
      </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span suppressHydrationWarning className={cn(state === "error" && "text-red-400")}>
          {stateText}
          {error && ` – ${error}`}
          {!isBoard && ` · ${t("editor.words", { n: words })}`}
          {" · "}
          {t("editor.saveHint")}
        </span>
      </div>

      <section className="mt-6 border-t pt-4" aria-label={t("editor.children.label")}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted">{t("editor.children.label")} {children.length > 0 && <span className="font-normal">{children.length}</span>}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onCreateChild}><Plus size={14} /> {t("editor.children.add")}</button>
        </div>
        {children.length > 0 && (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {children.map((c) => (
              <li key={c.id}>
                <Link href={`/docs/${c.id}`} className="flex items-center gap-2 rounded-lg border bg-bg/20 px-3 py-2 text-sm hover:border-accent/50">
                  <span>{docIcon(c)}</span>
                  <span className="truncate">{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
