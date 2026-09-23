"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Check, CircleAlert, Copy, FolderLock, History, KeyRound, LifeBuoy, Pause, Play, Plus, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import { KEY_LIFETIMES, MAX_KEY_PROJECTS, type KeyLifetime } from "@/lib/mcp/projectKeyLogic";
import { KEY_SCOPES, type KeyScope } from "@/lib/mcp/keySettings";
import { Toggle } from "@/components/theme/controls";
import { FormError } from "@/components/ui/FormError";
import { api, errorMessage } from "@/lib/client/api";
import { useFormat, useT } from "@/lib/i18n/client";
import type { ApiTokenItem } from "@/lib/mcp/token";
import { keyShortId } from "@/lib/taskInfoLogic";
import { installCommands } from "@/lib/mcp/installer";
import { cn } from "@/lib/utils";
import { AccountSection } from "./AccountManager";
import { KeySettings } from "./KeySettings";

/** Programmname aus dem User-Agent, z. B. „claude-cli/2.1.0“. */
const shortAgent = (ua: string | null) => (ua ? ua.split(/[\s(]/)[0].slice(0, 40) : "?");

interface CallItem {
  id: string;
  tool: string;
  ok: boolean;
  error: string | null;
  ms: number;
  token: string;
  at: string;
}

export function ApiTokensSection({
  initial,
  appUrl,
  rules,
  rulesVersion,
  sessionIdleHours,
  sessionTtlDays,
}: {
  initial: ApiTokenItem[];
  appUrl: string;
  rules: string;
  /** Aktuelle Fassung der Regeln – ältere Bestätigungen gelten als veraltet (#79) */
  rulesVersion: string;
  sessionIdleHours: number;
  sessionTtlDays: number;
}) {
  const t = useT("mcp");
  const f = useFormat();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<{ token: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallItem[] | null>(null);
  // Projekt-Schlüssel (#106)
  const [scoped, setScoped] = useState(false);
  // Voreinstellung wie bisher: alle Werkzeuge – aber sichtbar und änderbar (#192)
  const [scope, setScope] = useState<KeyScope>("all");
  const [grantable, setGrantable] = useState<Array<{ id: string; name: string; own: boolean; owner: string }> | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [lifetime, setLifetime] = useState<KeyLifetime>("never");
  const projectName = (id: string) => grantable?.find((p) => p.id === id)?.name ?? `#${id.slice(-6)}`;

  useEffect(() => {
    if (grantable || !(scoped || items.some((i) => i.projectScoped))) return;
    api<{ projects: Array<{ id: string; name: string; own: boolean; owner: string }> }>("/api/account/api-tokens/projects")
      .then((r) => setGrantable(r.projects))
      .catch(() => setGrantable([]));
  }, [scoped, items, grantable]);

  async function setPaused(item: ApiTokenItem, paused: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ item: ApiTokenItem }>(`/api/account/api-tokens/${item.id}`, { method: "PATCH", body: { paused } });
      setItems((list) => list.map((x) => (x.id === item.id ? res.item : x)));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const endpoint = `${appUrl}/api/mcp`;
  const command = (token: string) => `claude mcp add --scope user --transport http vibeworks ${endpoint} --header "Authorization: Bearer ${token}"`;

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* Zwischenablage gesperrt – der Text steht ja da */
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const body = { name, scope, ...(scoped ? { projects: picked } : {}), ...(lifetime !== "never" ? { lifetime } : {}) };
      const res = await api<{ token: string; item: ApiTokenItem }>("/api/account/api-tokens", { method: "POST", body });
      setItems((list) => [...list, res.item]);
      setFresh({ token: res.token, name: res.item.name });
      setName("");
      setPicked([]);
      setScoped(false);
      setLifetime("never");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/account/api-tokens/${id}`, { method: "DELETE" });
      setItems((list) => list.filter((x) => x.id !== id));
      setConfirming(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Protokoll erst beim Aufklappen laden
  function loadCalls() {
    api<{ calls: CallItem[] }>("/api/account/mcp-calls")
      .then((r) => setCalls(r.calls))
      .catch((err) => setError(errorMessage(err)));
  }

  const CopyButton = ({ value, id, label }: { value: string; id: string; label?: string }) => (
    <button type="button" className="btn btn-sm shrink-0" onClick={() => void copy(value, id)}>
      {copied === id ? <Check size={14} /> : <Copy size={14} />} {copied === id ? t("copied") : (label ?? t("copy"))}
    </button>
  );

  return (
    <AccountSection id="mcp" icon={<Bot size={18} />} title={t("section.title")} description={t("section.description")}>
      <p className="mb-4 text-sm text-muted">{t("can")}</p>

      {fresh && (
        <div className="mb-4 space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4" role="status">
          <p className="font-semibold text-emerald-400">{t("fresh.title", { name: fresh.name })}</p>
          <p className="text-sm">{t("fresh.once")}</p>
          <div className="flex flex-wrap items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border bg-black/30 p-3 font-mono text-xs" data-testid="mcp-command">
              {command(fresh.token)}
            </code>
            <CopyButton value={command(fresh.token)} id="command" />
          </div>
          <p className="text-sm">{t("fresh.oneLiner")}</p>
          {(["sh", "ps1"] as const).map((kind) => {
            const line = installCommands(appUrl, fresh.token)[kind];
            return (
              <div key={kind} className="flex flex-wrap items-start gap-2">
                <span className="w-full text-xs text-muted">{t(`fresh.${kind}`)}</span>
                <code className="min-w-0 flex-1 break-all rounded-lg border bg-black/30 p-3 font-mono text-xs" data-testid={`mcp-install-${kind}`}>
                  {line}
                </code>
                <CopyButton value={line} id={`install-${kind}`} />
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-muted" data-testid="mcp-token">{fresh.token}</code>
            <CopyButton value={fresh.token} id="token" label={t("fresh.key")} />
          </div>
          <p className="text-xs text-muted">{t("fresh.tryIt")}</p>
          <p className="text-xs text-muted">{t("fresh.other", { url: endpoint })}</p>
          <button type="button" className="btn btn-sm" onClick={() => setFresh(null)}>{t("fresh.done")}</button>
        </div>
      )}

      {items.length ? (
        <ul className="mb-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3" data-testid="api-token">
              <KeyRound size={16} className="shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span className="truncate">{item.name}</span>
                  <span className="rounded bg-fg/10 px-1 font-mono text-[10px] text-muted" title={t("keyIdHint")} data-testid="api-token-id">
                    {t("keyId", { id: keyShortId(item.id) })}
                  </span>
                  {(() => {
                    const current = Boolean(item.rulesAckAt) && item.rulesVersion === rulesVersion;
                    const outdated = Boolean(item.rulesAckAt) && !current;
                    return (
                      <span
                        className={cn("chip !py-0.5 text-[11px]", current ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400")}
                        title={current && item.rulesAckAt ? t("rules.ackedAt", { ago: f.ago(item.rulesAckAt) }) : outdated ? t("rules.outdatedHint") : t("rules.pendingHint")}
                        data-testid="api-token-rules"
                        suppressHydrationWarning
                      >
                        {current ? <ShieldCheck size={11} /> : <CircleAlert size={11} />} {current ? t("rules.acked") : outdated ? t("rules.outdated") : t("rules.pending")}
                      </span>
                    );
                  })()}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="api-token-scope" suppressHydrationWarning>
                  {item.projectScoped ? (
                    <span className="chip !py-0.5 text-[11px]" title={item.projectIds.map(projectName).join(", ")}>
                      <FolderLock size={11} /> {t("projectKey.projects", { list: item.projectIds.map(projectName).join(", ") || "–" })}
                    </span>
                  ) : (
                    <span className="text-muted">{t("projectKey.allProjects")}</span>
                  )}
                  {item.state !== "active" && (
                    <span className="chip !py-0.5 border-amber-500/40 text-[11px] text-amber-400" data-testid="api-token-state">
                      {t(`projectKey.state.${item.state}`)}
                    </span>
                  )}
                  {item.expiresAt && item.state === "active" && <span className="text-muted">{t("projectKey.expires", { when: f.dateTime(item.expiresAt) })}</span>}
                </p>
                <p className="text-xs text-muted" suppressHydrationWarning>
                  <span className="font-mono">{item.hint}</span> · {item.lastUsedAt ? t("lastUsed", { ago: f.ago(item.lastUsedAt) }) : t("neverUsed")} · {t("created", { ago: f.ago(item.createdAt) })}
                </p>
                {item.lastUsedIp && (
                  <p className="text-xs text-muted" title={item.lastUsedUserAgent ?? undefined} data-testid="api-token-last-from">
                    {t("lastFrom", { ip: item.lastUsedIp, agent: shortAgent(item.lastUsedUserAgent) })}
                  </p>
                )}
                {item.clientName && (
                  <p className="text-xs text-muted">
                    {t("client", { name: [item.clientName, item.clientVersion].filter(Boolean).join(" "), protocol: item.clientProtocol ?? "?" })}
                  </p>
                )}
              </div>
              <KeySettings item={item} onSaved={(next) => setItems((list) => list.map((x) => (x.id === next.id ? next : x)))} />
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void setPaused(item, !item.disabledAt)} data-testid="api-token-pause">
                {item.disabledAt ? <Play size={13} /> : <Pause size={13} />} {item.disabledAt ? t("projectKey.resume") : t("projectKey.pause")}
              </button>
              {confirming === item.id ? (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-sm text-red-400" disabled={busy} onClick={() => void revoke(item.id)}>{t("revokeConfirm")}</button>
                  <button type="button" className="btn btn-sm" onClick={() => setConfirming(null)}>{t("cancel")}</button>
                </div>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => setConfirming(item.id)}>{t("revoke")}</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">{t("empty")}</p>
      )}

      <form
        className="space-y-3 rounded-2xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <p className="text-sm font-semibold">{t("createTitle")}</p>
        {/* Name + Gültigkeit nebeneinander (Handy: untereinander), Knopf rechts daneben */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-end">
          <div className="min-w-0">
            <label className="label" htmlFor="api-token-name">{t("name")}</label>
            <input id="api-token-name" className="field w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} maxLength={60} />
          </div>
          <div className="min-w-0">
            {/* Umfang gleich beim Anlegen wählen (#192) – vorher bekam jeder neue Schlüssel „Alles“ */}
            <label className="label" htmlFor="api-token-scope-new">{t("keySettings.scopeLabel")}</label>
            <select id="api-token-scope-new" className="field w-full" value={scope} onChange={(e) => setScope(e.target.value as KeyScope)} data-testid="api-token-scope-new">
              {KEY_SCOPES.map((s) => (
                <option key={s} value={s}>
                  {t(`keySettings.scope.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="label" htmlFor="api-token-lifetime">{t("projectKey.lifetime")}</label>
            <select id="api-token-lifetime" className="field w-full" value={lifetime} onChange={(e) => setLifetime(e.target.value as KeyLifetime)} data-testid="api-token-lifetime">
              {KEY_LIFETIMES.map((l) => (
                <option key={l} value={l}>
                  {t(`projectKey.lifetimes.${l}`)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm whitespace-nowrap" disabled={busy || !name.trim() || (scoped && picked.length === 0)} data-testid="api-token-create">
            <Plus size={14} /> {busy ? t("creating") : t("create")}
          </button>
        </div>
        <div className="space-y-2" data-testid="project-key">
          <Toggle label={t("projectKey.toggle")} hint={t("projectKey.hint")} checked={scoped} onChange={setScoped} />
          {scoped &&
            (grantable === null ? (
              <div className="h-8 animate-pulse rounded-lg bg-fg/5" />
            ) : grantable.length === 0 ? (
              <p className="text-xs text-muted">{t("projectKey.none")}</p>
            ) : (
              <fieldset className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto" data-testid="project-key-projects">
                <legend className="sr-only">{t("projectKey.pick")}</legend>
                {grantable.map((p) => {
                  const on = picked.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn("chip !py-0.5 text-xs", on && "chip-active")}
                      aria-pressed={on}
                      disabled={!on && picked.length >= MAX_KEY_PROJECTS}
                      onClick={() => setPicked((list) => (on ? list.filter((x) => x !== p.id) : [...list, p.id]))}
                    >
                      {p.name} <span className="text-[10px] text-muted">{p.own ? t("projectKey.own") : t("projectKey.of", { name: p.owner })}</span>
                    </button>
                  );
                })}
              </fieldset>
            ))}
          {scoped && picked.length > 0 && (
            <p className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200" data-testid="project-key-warn">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" /> {t("projectKey.warn", { n: picked.length, list: picked.map(projectName).join(", ") })}
            </p>
          )}
        </div>
      </form>
      <div className="mt-3">
        <FormError message={error} />
      </div>

      <div className="mt-5 rounded-2xl border px-4 py-3 text-xs text-muted" data-testid="key-lifecycle">
        <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-fg">
          <LifeBuoy size={14} className="text-accent-ink" /> {t("lifecycle.title")}
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("lifecycle.keys")}</li>
          <li>{t("lifecycle.sessions", { hours: sessionIdleHours, days: sessionTtlDays })}</li>
          <li>{t("lifecycle.codes")}</li>
          <li>{t("lifecycle.update")}</li>
        </ul>
      </div>

      <div className="mt-3 rounded-2xl border px-4 py-3 text-sm" data-testid="device-how">
        <p className="font-semibold">{t("device.howTitle")}</p>
        <p className="mt-1 text-xs text-muted">{t("device.how")}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <Link href="/verbinden" className="btn btn-sm">
            {`${appUrl}/verbinden`}
          </Link>
          <code className="break-all text-xs text-muted">POST {endpoint}/device</code>
        </p>
      </div>

      <details className="mt-3 rounded-2xl border px-4 py-3" data-testid="agent-rules">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <ScrollText size={14} className="text-accent-ink" /> {t("rules.title")}
        </summary>
        <p className="mt-2 text-xs text-muted">{t("rules.hint")}</p>
        <div className="mt-3 flex justify-end">
          <CopyButton value={rules} id="rules" />
        </div>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border bg-black/20 p-3 font-mono text-[11px] leading-relaxed">{rules}</pre>
      </details>

      <details className="mt-3 rounded-2xl border px-4 py-3" data-testid="mcp-calls" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && loadCalls()}>
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <History size={14} className="text-accent-ink" /> {t("calls.title")}
        </summary>
        <p className="mt-2 text-xs text-muted">{t("calls.hint")}</p>
        {calls === null ? (
          <p className="mt-3 text-sm text-muted">{t("calls.loading")}</p>
        ) : calls.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("calls.empty")}</p>
        ) : (
          <ul className="mt-3 max-h-80 divide-y divide-fg/10 overflow-y-auto text-xs">
            {calls.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5" data-testid="mcp-call">
                <span className={cn("flex items-center gap-1", c.ok ? "text-emerald-400" : "text-red-400")}>
                  {c.ok ? <Check size={12} /> : <CircleAlert size={12} />}
                </span>
                <code className="font-mono">{c.tool}</code>
                <span className="text-muted">{c.token}</span>
                <span className="text-muted">{t("calls.ms", { n: c.ms })}</span>
                <span className="ml-auto text-muted" suppressHydrationWarning>{f.ago(c.at)}</span>
                {c.error && <span className="basis-full text-red-400/90">{c.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </details>
    </AccountSection>
  );
}
