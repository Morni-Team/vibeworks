"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, BookOpen, ChevronDown, ChevronRight, FolderInput, PanelLeft, Plus, Search, Shapes, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { Modal } from "@/components/ui/Modal";
import type { DocDetail, DocTreeItem } from "@/lib/docs";
import { docIcon } from "@/lib/docs/kinds";
import { api, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { useFormat, useLocale, useT } from "@/lib/i18n/client";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { DocEditor } from "./DocEditor";
import { confirmDialog } from "@/lib/client/dialogs";

const EXPANDED_KEY = "vw.docs.expanded";

export function DocsShell({ tree: initialTree, doc }: { tree: DocTreeItem[]; doc: DocDetail | null }) {
  const t = useT("docs");
  const tc = useT("common");
  const f = useFormat();
  const locale = useLocale();
  const sortItems = useCallback(
    (a: DocTreeItem, b: DocTreeItem) => a.position - b.position || a.title.localeCompare(b.title, INTL_LOCALE[locale]),
    [locale],
  );
  const router = useRouter();
  const [tree, setTree] = useState(initialTree);
  const [filter, setFilter] = useState("");
  const [treeOpen, setTreeOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState<DocTreeItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTree(initialTree), [initialTree]);

  const byId = useMemo(() => new Map(tree.map((t) => [t.id, t])), [tree]);
  const byParent = useMemo(() => {
    const map = new Map<string | null, DocTreeItem[]>();
    for (const t of tree) {
      const key = t.parentId && byId.has(t.parentId) ? t.parentId : null;
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    for (const list of map.values()) list.sort(sortItems);
    return map;
  }, [tree, byId, sortItems]);

  const descendants = useCallback(
    (id: string): string[] => (byParent.get(id) ?? []).flatMap((c) => [c.id, ...descendants(c.id)]),
    [byParent],
  );

  // Aufgeklappte Zweige merken; die Vorfahren der offenen Seite immer aufklappen.
  useEffect(() => {
    let stored: string[] = [];
    try {
      stored = JSON.parse(localStorage.getItem(EXPANDED_KEY) ?? "[]");
    } catch {
      /* egal */
    }
    const next = new Set(stored);
    for (let p = doc?.parentId ? byId.get(doc.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) next.add(p.id);
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);
  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]));
      } catch {
        /* egal */
      }
      return next;
    });

  async function create(parentId: string | null, kind: "PAGE" | "BOARD" = "PAGE") {
    setError(null);
    try {
      const res = await api<{ doc: DocDetail; item: DocTreeItem }>("/api/docs", {
        body: { parentId, kind, title: t(kind === "BOARD" ? "tree.defaultBoardTitle" : "tree.defaultTitle") },
      });
      setTree((t) => [...t, res.item]);
      if (parentId) setExpanded((s) => new Set(s).add(parentId));
      setTreeOpen(false);
      router.push(`/docs/${res.doc.id}`);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function patchStructure(item: DocTreeItem, body: object) {
    setError(null);
    try {
      const res = await api<{ tree?: DocTreeItem[] }>(`/api/docs/${item.id}`, { method: "PATCH", body });
      if (res.tree) setTree(res.tree);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function remove(item: DocTreeItem) {
    const sub = descendants(item.id).length;
    if (!(await confirmDialog(sub ? t("tree.confirmDeleteWithChildren", { title: item.title, n: sub }) : t("tree.confirmDelete", { title: item.title }), { danger: true }))) return;
    setError(null);
    try {
      const res = await api<{ tree: DocTreeItem[] }>(`/api/docs/${item.id}`, { method: "DELETE" });
      setTree(res.tree);
      if (doc && (doc.id === item.id || descendants(item.id).includes(doc.id))) router.push("/docs");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const onSaved = useCallback((item: DocTreeItem) => setTree((t) => t.map((x) => (x.id === item.id ? { ...x, ...item } : x))), []);

  function renderNodes(parentId: string | null, depth: number): React.ReactNode {
    const items = byParent.get(parentId) ?? [];
    if (!items.length) return null;
    return (
      <ul>
        {items.map((item, index) => {
          const kids = byParent.get(item.id) ?? [];
          const open = expanded.has(item.id);
          const active = doc?.id === item.id;
          return (
            <li key={item.id}>
              <div className={cn("group flex items-center gap-0.5 rounded-lg pr-1 text-sm", active ? "bg-accent/15 text-fg" : "text-muted hover:bg-fg/5 hover:text-fg")} style={{ paddingLeft: depth * 14 }}>
                <button
                  type="button"
                  onClick={() => kids.length && toggle(item.id)}
                  className="flex h-7 w-6 shrink-0 items-center justify-center"
                  aria-label={kids.length ? (open ? t("tree.collapse") : t("tree.expand")) : undefined}
                  tabIndex={kids.length ? 0 : -1}
                >
                  {kids.length ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : <span className="h-1 w-1 rounded-full bg-fg/25" />}
                </button>
                <Link href={`/docs/${item.id}`} onClick={() => setTreeOpen(false)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5" aria-current={active ? "page" : undefined}>
                  <span className="shrink-0">{docIcon(item)}</span>
                  <span className="truncate">{item.title}</span>
                </Link>
                <button type="button" onClick={() => void create(item.id)} className="rounded p-1 opacity-0 transition hover:bg-fg/10 group-hover:opacity-100 focus:opacity-100" aria-label={t("tree.addChildOf", { title: item.title })} title={t("tree.addChild")}>
                  <Plus size={14} />
                </button>
                <ActionMenu
                  label={t("tree.actions", { title: item.title })}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 aria-expanded:opacity-100"
                  items={[
                    { label: t("tree.moveUp"), icon: ArrowUp, disabled: index === 0, onClick: () => void patchStructure(item, { move: "up" }) },
                    { label: t("tree.moveDown"), icon: ArrowDown, disabled: index === items.length - 1, onClick: () => void patchStructure(item, { move: "down" }) },
                    { label: t("tree.move"), icon: FolderInput, onClick: () => { setMoving(item); setMoveTarget(item.parentId ?? ""); } },
                    { label: tc("delete"), icon: Trash2, danger: true, onClick: () => void remove(item) },
                  ]}
                />
              </div>
              {kids.length > 0 && open && renderNodes(item.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  const q = filter.trim().toLowerCase();
  const matches = q ? tree.filter((d) => d.title.toLowerCase().includes(q)).sort(sortItems) : [];

  // Ziele beim Verschieben: alles außer der Seite selbst und ihren Unterseiten
  const moveOptions = useMemo(() => {
    if (!moving) return [];
    const blocked = new Set([moving.id, ...descendants(moving.id)]);
    const out: Array<{ id: string; label: string }> = [];
    const walk = (parent: string | null, depth: number) => {
      for (const t of byParent.get(parent) ?? []) {
        if (blocked.has(t.id)) continue;
        out.push({ id: t.id, label: `${"  ".repeat(depth)}${docIcon(t)} ${t.title}` });
        walk(t.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [moving, byParent, descendants]);

  const recent = [...tree].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 9);

  return (
    <div className="fade-in grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className={cn("glass flex-col p-3 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-8rem)] lg:self-start", treeOpen ? "flex" : "hidden")} aria-label={t("tree.label")}>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <Link href="/docs" className="flex items-center gap-2 font-semibold"><BookOpen size={17} className="text-accent-ink" /> {t("tree.title")}</Link>
          <span className="flex items-center gap-0.5">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void create(null, "BOARD")} aria-label={t("tree.newBoard")} title={t("tree.newBoard")}><Shapes size={16} /></button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => void create(null)} aria-label={t("tree.newPage")} title={t("tree.newPage")}><Plus size={16} /></button>
          </span>
        </div>
        <div className="relative mb-2">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field !min-h-8 !py-1 pl-8 text-sm" placeholder={t("tree.filter")} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t("tree.filter")} />
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          {q ? (
            matches.length ? (
              <ul>
                {matches.map((d) => (
                  <li key={d.id}>
                    <Link href={`/docs/${d.id}`} onClick={() => setTreeOpen(false)} className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm", doc?.id === d.id ? "bg-accent/15" : "text-muted hover:bg-fg/5 hover:text-fg")}>
                      <span>{docIcon(d)}</span>
                      <span className="truncate">{d.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-2 py-4 text-xs text-muted">{t("tree.noMatch")}</p>
            )
          ) : tree.length ? (
            renderNodes(null, 0)
          ) : (
            <p className="px-2 py-4 text-xs text-muted">{t("tree.empty")}</p>
          )}
        </nav>
      </aside>

      <section className="min-w-0 space-y-3">
        <button className="btn btn-sm lg:hidden" onClick={() => setTreeOpen((o) => !o)} aria-expanded={treeOpen}>
          <PanelLeft size={15} /> {treeOpen ? t("tree.hide") : t("tree.show")}
        </button>
        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        {doc ? (
          <DocEditor key={doc.id} doc={doc} tree={tree} onSaved={onSaved} onCreateChild={() => void create(doc.id)} />
        ) : tree.length === 0 ? (
          <div className="glass flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-accent-ink"><BookOpen size={30} /></span>
            <h1 className="mt-4 text-2xl font-bold">{t("home.welcomeTitle")}</h1>
            <p className="mt-2 max-w-md text-muted">{t("home.welcomeText")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" onClick={() => void create(null)}><Plus size={17} /> {t("home.createFirst")}</button>
              <button className="btn" onClick={() => void create(null, "BOARD")}><Shapes size={17} /> {t("home.createBoard")}</button>
            </div>
          </div>
        ) : (
          <div className="glass p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">{t("home.title")}</h1>
              <span className="flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => void create(null, "BOARD")}><Shapes size={15} /> {t("tree.newBoard")}</button>
                <button className="btn btn-primary btn-sm" onClick={() => void create(null)}><Plus size={15} /> {t("tree.newPage")}</button>
              </span>
            </div>
            <h2 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">{t("home.recent")}</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((d) => (
                <li key={d.id}>
                  <Link href={`/docs/${d.id}`} className="lift flex items-center gap-3 rounded-xl border bg-bg/20 p-3">
                    <span className="text-2xl">{docIcon(d)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="block text-xs text-muted" suppressHydrationWarning>{f.ago(d.updatedAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        title={t("move.title", { title: moving?.title ?? "" })}
        size="sm"
        footer={
          <>
            <button className="btn btn-sm" onClick={() => setMoving(null)}>{tc("cancel")}</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (moving) void patchStructure(moving, { parentId: moveTarget || null });
                setMoving(null);
              }}
            >
              <FolderInput size={14} /> {t("move.submit")}
            </button>
          </>
        }
      >
        <label className="label" htmlFor="move-target">{t("move.parent")}</label>
        <select id="move-target" className="field" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
          <option value="">{t("move.root")}</option>
          {moveOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </Modal>
    </div>
  );
}
