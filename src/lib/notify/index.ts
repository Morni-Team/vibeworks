import type { NotificationSettings } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { decrypt } from "@/lib/crypto";
import { safeFetch } from "@/lib/security/ssrf";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { makeT, tk, type TFunction } from "@/lib/i18n/messages";
import { eventsOf, ntfyRequest, webhookBody, withUrgency, type Channel, type Notice, type NotifyEvent } from "./format";
import { decideNotice, readRules } from "./rulesLogic";
import { sendMail } from "./mail";
import { deliverDiscord } from "@/lib/discord/discord";

// Versand an die Kanäle eines Kontos: ntfy, Webhook, E-Mail. Jede Nachricht
// wird in der Sprache des Empfängers gebaut. Fehler landen am Konto
// (lastError), nie beim Auslöser – eine Benachrichtigung darf nichts kaputtmachen.

export interface ChannelResult {
  channel: Channel;
  ok: boolean;
  error?: string;
}

export const appLink = (path: string) => `${config.appUrl}${path}`;

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await safeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "VibeWorks", ...headers },
    body: JSON.stringify(body),
    timeoutMs: 10_000,
  });
  if (!res.ok) throw new Error(tk("notify", "errors.http", { status: res.status }));
}

export async function deliver(s: NotificationSettings, notice: Notice): Promise<ChannelResult[]> {
  notice = withUrgency(notice, s.urgentCritical);
  const results: ChannelResult[] = [];
  const attempt = async (channel: Channel, send: () => Promise<void>) => {
    try {
      await send();
      results.push({ channel, ok: true });
    } catch (err) {
      results.push({ channel, ok: false, error: err instanceof Error && err.message ? err.message : tk("notify", "errors.failed") });
    }
  };
  if (s.ntfyUrl) {
    await attempt("ntfy", async () => {
      const req = ntfyRequest(s.ntfyUrl!, notice, s.ntfyTokenCipher ? decrypt(s.ntfyTokenCipher) : null);
      if (!req) throw new Error(tk("notify", "errors.badNtfy"));
      await postJson(req.url, req.body, req.headers);
    });
  }
  if (s.webhookUrl) await attempt("webhook", () => postJson(s.webhookUrl!, webhookBody(s.webhookUrl!, notice)));
  if (s.email) await attempt("email", () => sendMail(s.email!, notice));

  const failed = results.find((r) => !r.ok);
  await db.notificationSettings.update({
    where: { userId: s.userId },
    data: { lastSentAt: new Date(), lastError: failed ? `${failed.channel}|${failed.error}` : null },
  });
  return results;
}

/** Posteingang – die Windows-App holt ihn ab und zeigt daraus Windows-Meldungen. */
export async function storeInbox(userId: string, n: Notice): Promise<void> {
  await db.notification.create({ data: { userId, event: n.event, title: n.title.slice(0, 300), message: n.message.slice(0, 4000), url: n.url } });
}

export const hasChannel = (s: NotificationSettings) => Boolean(s.ntfyUrl || s.webhookUrl || s.email);

/** Woher die Meldung kommt – für die Regeln (#109). */
export interface NotifyOrigin {
  projectId?: string | null;
  /** Wer sie ausgelöst hat (Konto- oder Git-Name) */
  author?: string | null;
}

/**
 * Ein Konto über einen Anlass benachrichtigen – sofern es ihn nicht
 * ausgeschaltet hat und die Regeln passen: immer in den Posteingang, dazu an
 * die eingetragenen Kanäle. Wichtige Wörter kommen auch bei ausgeschaltetem
 * Anlass durch und gelten als dringend.
 */
export async function notifyUser(
  userId: string,
  event: NotifyEvent,
  build: (t: TFunction<"notify">, locale: Locale) => Notice,
  origin: NotifyOrigin = {},
): Promise<void> {
  try {
    const [s, user] = await Promise.all([
      db.notificationSettings.findUnique({ where: { userId } }),
      db.user.findUnique({ where: { id: userId }, select: { locale: true, active: true } }),
    ]);
    if (!user?.active) return;
    const locale: Locale = isLocale(user.locale) ? user.locale : "de";
    const built = build(makeT(locale, "notify"), locale);
    const decision = decideNotice(readRules(s?.rules), s?.events ?? {}, { event, projectId: origin.projectId, author: origin.author, text: `${built.title}\n${built.message}` });
    if (!decision.send) return;
    const notice = decision.important ? { ...built, priority: built.priority ?? ("high" as const) } : built;
    await storeInbox(userId, notice);
    if (s && hasChannel(s)) await deliver(s, notice);
    // Discord-Server des Kontos (#105) – eigene Fehlerablage am Link
    await deliverDiscord(userId, withUrgency(notice, s?.urgentCritical ?? true));
  } catch (err) {
    console.error("[notify]", event, err);
  }
}

export function notificationView(s: NotificationSettings | null) {
  return {
    ntfyUrl: s?.ntfyUrl ?? "",
    hasNtfyToken: Boolean(s?.ntfyTokenCipher),
    webhookUrl: s?.webhookUrl ?? "",
    email: s?.email ?? "",
    events: eventsOf(s?.events),
    rules: readRules(s?.rules),
    urgentCritical: s?.urgentCritical ?? true,
    lastError: s?.lastError ?? null,
    lastSentAt: s?.lastSentAt?.toISOString() ?? null,
  };
}
type NotificationView = ReturnType<typeof notificationView>;
