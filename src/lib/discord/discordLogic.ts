import { createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";
import { z } from "zod";

// Discord-Anbindung (#105) ohne Netz und Datenbank: Signaturen prüfen,
// Einladungs-Link bauen, Befehle beschreiben, Berichte formatieren.

export const DISCORD_API = "https://discord.com/api/v10";

/** Rechte des Bots: Kanäle sehen, Nachrichten senden, Links einbetten – mehr nicht. */
const BOT_PERMISSIONS = String(1024 + 2048 + 16384);

export { REPORT_MODES } from "./modes";

/** Stunde (Europe/Berlin), ab der der Bericht verschickt wird; wöchentlich montags. */
const REPORT_HOUR = 8;

// Ed25519-Schlüssel im SPKI-Format: fester Vorspann + 32 Byte
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** Prüft die Signatur, die Discord jeder Interaktion mitgibt. */
export function verifyDiscordSignature(publicKeyHex: string, signatureHex: string | null, timestamp: string | null, body: string): boolean {
  if (!signatureHex || !timestamp || !/^[0-9a-f]{64}$/i.test(publicKeyHex) || !/^[0-9a-f]{128}$/i.test(signatureHex)) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

export const redirectUri = (appUrl: string) => `${appUrl}/api/discord/callback`;
export const interactionsUrl = (appUrl: string) => `${appUrl}/api/discord/interactions`;

/** Einladung: Server wählen, Rechte bestätigen – und gleich das Discord-Konto erkennen (identify). */
export function installUrl(appId: string, appUrl: string, state: string): string {
  const q = new URLSearchParams({
    client_id: appId,
    scope: "bot applications.commands identify",
    permissions: BOT_PERMISSIONS,
    response_type: "code",
    redirect_uri: redirectUri(appUrl),
    state,
    integration_type: "0",
  });
  return `https://discord.com/oauth2/authorize?${q.toString()}`;
}

const STATE_TTL_MS = 15 * 60_000;
const sign = (secret: string, payload: string) => createHmac("sha256", `discord-state:${secret}`).update(payload).digest("base64url");

/** Signierter State für die Rückkehr von Discord – gebunden an Konto und Zeit. */
export function makeState(secret: string, userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ u: userId, e: now + STATE_TTL_MS })).toString("base64url");
  return `${payload}.${sign(secret, payload)}`;
}

export function readState(secret: string, state: string | null, now = Date.now()): string | null {
  const [payload, mac] = (state ?? "").split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(secret, payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: unknown; e?: unknown };
    return typeof data.u === "string" && typeof data.e === "number" && data.e > now ? data.u : null;
  } catch {
    return null;
  }
}

/** Der eine Befehl mit Unterbefehlen – deutsch mit englischer Fassung. */
export const COMMANDS = [
  {
    name: "vibeworks",
    type: 1,
    description: "VibeWorks: Status, Aufgaben und Probleme deiner Projekte",
    description_localizations: { "en-US": "VibeWorks: status, tasks and problems of your projects", "en-GB": "VibeWorks: status, tasks and problems of your projects" },
    contexts: [0],
    options: [
      { type: 1, name: "status", description: "Kurzbericht: offen, erledigt, Probleme", description_localizations: { "en-US": "Short report: open, done, problems" } },
      { type: 1, name: "aufgaben", description: "Die dringendsten offenen Aufgaben", description_localizations: { "en-US": "The most urgent open tasks" }, name_localizations: { "en-US": "tasks" } },
      { type: 1, name: "probleme", description: "Was gerade klemmt", description_localizations: { "en-US": "What needs attention" }, name_localizations: { "en-US": "problems" } },
      { type: 1, name: "hier", description: "Benachrichtigungen und Berichte in diesen Kanal", description_localizations: { "en-US": "Send notifications and reports to this channel" }, name_localizations: { "en-US": "here" } },
    ],
  },
];

export type Subcommand = "status" | "aufgaben" | "probleme" | "hier";

const interactionSchema = z.object({
  type: z.number(),
  data: z.object({ name: z.string().optional(), options: z.array(z.object({ name: z.string() })).optional() }).optional(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  channel: z.object({ name: z.string().optional() }).optional(),
  locale: z.string().optional(),
  member: z.object({ user: z.object({ id: z.string() }) }).optional(),
  user: z.object({ id: z.string() }).optional(),
});

export interface ParsedInteraction {
  type: number;
  command: string | null;
  sub: Subcommand | null;
  userId: string | null;
  guildId: string | null;
  channelId: string | null;
  channelName: string | null;
  locale: "de" | "en";
}

export function parseInteraction(raw: unknown): ParsedInteraction | null {
  const parsed = interactionSchema.safeParse(raw);
  if (!parsed.success) return null;
  const i = parsed.data;
  const sub = i.data?.options?.[0]?.name ?? null;
  return {
    type: i.type,
    command: i.data?.name ?? null,
    sub: sub === "status" || sub === "aufgaben" || sub === "probleme" || sub === "hier" ? sub : null,
    userId: i.member?.user.id ?? i.user?.id ?? null,
    guildId: i.guild_id ?? null,
    channelId: i.channel_id ?? null,
    channelName: i.channel?.name ?? null,
    locale: i.locale?.startsWith("de") ? "de" : "en",
  };
}

/** Nur Text- und Ankündigungskanäle kommen für Nachrichten infrage. */
export function textChannels(raw: unknown): Array<{ id: string; name: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is { id: string; name: string; type: number; position?: number } => Boolean(c) && typeof c.id === "string" && typeof c.name === "string" && (c.type === 0 || c.type === 5))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((c) => ({ id: c.id, name: c.name }));
}

/** Ist ein Bericht fällig? Täglich ab 8 Uhr, wöchentlich montags ab 8 Uhr – je Tag nur einmal. */
export function reportDue(mode: string, lastSentOn: string | null, today: string, hour: number, weekday: number): boolean {
  if (mode === "off" || hour < REPORT_HOUR || lastSentOn === today) return false;
  if (mode === "weekly") return weekday === 1;
  return mode === "daily";
}

export interface ReportData {
  period: "day" | "week";
  open: { todo: number; doing: number; blocked: number; overdue: number };
  done: Array<{ title: string; project: string }>;
  doing: Array<{ title: string; project: string; who: string | null }>;
  problems: string[];
  workflows: Array<{ title: string; project: string; done: number; total: number }>;
  url: string;
}

interface ReportText {
  title: string;
  open: string;
  done: string;
  doing: string;
  problems: string;
  none: string;
  workflows: string;
  footer: string;
}

const list = (items: string[], max: number, more: (n: number) => string) =>
  items.length ? [...items.slice(0, max), ...(items.length > max ? [more(items.length - max)] : [])].join("\n").slice(0, 1000) : null;

/** Discord-Embed eines Berichts – Feldgrenzen von Discord eingehalten. */
export function reportEmbed(d: ReportData, t: ReportText, more: (n: number) => string) {
  const color = d.problems.length ? 0xf87171 : d.open.overdue || d.open.blocked ? 0xfbbf24 : 0x34d399;
  const fields = [
    { name: t.open, value: `📋 ${d.open.todo} · 🔨 ${d.open.doing} · ⛔ ${d.open.blocked} · ⏰ ${d.open.overdue}`, inline: false },
    { name: t.done, value: list(d.done.map((x) => `✅ ${x.title} · *${x.project}*`), 8, more) ?? t.none, inline: false },
    { name: t.doing, value: list(d.doing.map((x) => `🔨 ${x.title} · *${x.project}*${x.who ? ` (${x.who})` : ""}`), 6, more) ?? t.none, inline: false },
    ...(d.workflows.length ? [{ name: t.workflows, value: list(d.workflows.map((w) => `🧭 ${w.title} · *${w.project}* ${w.done}/${w.total}`), 5, more)!, inline: false }] : []),
    { name: t.problems, value: list(d.problems.map((p) => `⚠️ ${p}`), 8, more) ?? `✨ ${t.none}`, inline: false },
  ];
  return { title: t.title.slice(0, 256), url: d.url, color, fields: fields.map((f) => ({ ...f, name: f.name.slice(0, 256), value: f.value.slice(0, 1024) || "–" })), footer: { text: t.footer.slice(0, 2048) } };
}

/** Eine VibeWorks-Benachrichtigung als Embed. */
export function noticeEmbed(n: { title: string; message: string; url: string | null; priority?: string }) {
  const color = n.priority === "urgent" ? 0xef4444 : n.priority === "high" ? 0xf59e0b : 0x8b5cf6;
  return { title: n.title.slice(0, 256), description: n.message.slice(0, 3500), ...(n.url ? { url: n.url } : {}), color };
}
