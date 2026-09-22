import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { decrypt, encrypt, sha256 } from "@/lib/crypto";
import { makeT, tk } from "@/lib/i18n/messages";
import { isLocale } from "@/lib/i18n/config";
import { storeInbox } from "@/lib/notify";
import { MAX_TOKENS, newApiToken } from "./token";
import { OAUTH_TTL_MS, newAuthorizationCode, newClientId, oauthReturnUrl, s256Challenge, tokenResult } from "./oauthFlowLogic";
import type { KeyScope } from "./keySettings";

// OAuth-Abläufe (#141) mit Datenbank, parallel zur Geräte-Anmeldung (#104):
// Registrierung und Autorisierung sind öffentlich (das Programm startet sie),
// freigeben kann nur ein angemeldetes Konto auf /verbinden. Der Schlüssel
// geht genau einmal und nur gegen den richtigen PKCE-Verifier raus.

/** Offene Abläufe je Adresse – mehr braucht kein Programm. */
const MAX_PENDING_PER_IP = 5;
/** Registrierte Programme je Adresse und Stunde. */
const MAX_CLIENTS_PER_IP = 20;
/** Wie lange eine Registrierung gilt – lange genug für mehrere Anläufe. */
const CLIENT_TTL_MS = 24 * 60 * 60_000;

/** Abgelaufene Abläufe und Registrierungen wegräumen. */
async function sweepOld(now: Date) {
  await db.oAuthFlow.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.oAuthClient.deleteMany({ where: { expiresAt: { lt: now } } });
}

/** Dynamische Client-Registrierung (RFC 7591) – kurzlebig, kein Konto nötig. */
export async function registerClient(input: { client_name: string; redirect_uris: string[] }, ip: string | null) {
  const now = new Date();
  await sweepOld(now);
  if (ip && (await db.oAuthClient.count({ where: { ip, createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } } })) >= MAX_CLIENTS_PER_IP) {
    throw new ApiError(429, "Too many client registrations from this address – try again later.");
  }
  const clientId = newClientId();
  // Name und Rückkehr-Adressen merken: nur damit lässt sich die Autorisierung
  // später prüfen und der Mensch sieht, welches Programm wirklich fragt (#188)
  await db.oAuthClient.create({
    data: { clientId, name: input.client_name, redirectUris: input.redirect_uris, ip, expiresAt: new Date(now.getTime() + CLIENT_TTL_MS) },
  });
  return { client_id: clientId, client_id_issued_at: Math.floor(now.getTime() / 1000), client_name: input.client_name, redirect_uris: input.redirect_uris, token_endpoint_auth_method: "none" };
}

/**
 * Registriertes Programm zu einer Kennung – nur, wenn die Rückkehr-Adresse
 * exakt zur Registrierung passt (RFC 6749 §3.1.2.3). Sonst könnte jeder eine
 * fremde Kennung mit eigener Adresse verbinden und den Code abfangen (#188).
 */
export async function clientForAuthorization(clientId: string, redirectUri: string): Promise<{ name: string } | null> {
  const row = await db.oAuthClient.findUnique({ where: { clientId }, select: { name: true, redirectUris: true, expiresAt: true } });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.redirectUris.includes(redirectUri) ? { name: row.name } : null;
}

/** Autorisierung starten: Code anlegen, Mensch auf /verbinden schicken. */
export async function startAuthorization(input: { clientId: string; clientName: string; redirectUri: string; scope: KeyScope; codeChallenge: string; state: string | null; ip: string | null }) {
  const now = new Date();
  await sweepOld(now);
  if (input.ip && (await db.oAuthFlow.count({ where: { ip: input.ip, status: "pending", createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } } })) >= MAX_PENDING_PER_IP) {
    throw new ApiError(429, "Too many pending authorizations from this address – try again later.");
  }
  const code = newAuthorizationCode();
  await db.oAuthFlow.create({
    data: {
      clientId: input.clientId,
      clientName: input.clientName,
      codeHash: sha256(code),
      codeChallenge: input.codeChallenge,
      scope: input.scope,
      redirectUri: input.redirectUri,
      state: input.state,
      ip: input.ip,
      expiresAt: new Date(Date.now() + OAUTH_TTL_MS),
    },
  });
  // Der Mensch sieht nur den Freigabe-Auftrag – der state des Programms bleibt
  // serverseitig gemerkt und kommt erst auf der Rückkehr mit
  const url = new URL(`${config.appUrl}/verbinden`);
  url.searchParams.set("oauth", code);
  return url.toString();
}

/** Freigabe-Auftrag zu einem Code lesen – für die Seite /verbinden. */
export async function pendingByOAuthCode(input: string) {
  if (input.length < 10 || input.length > 128) return null;
  const row = await db.oAuthFlow.findUnique({ where: { codeHash: sha256(input) } });
  if (!row || row.status !== "pending" || row.expiresAt.getTime() <= Date.now()) return null;
  // redirectUri und state wandern mit: die Seite zeigt sie an und nach der
  // Freigabe kehrt der Browser dorthin zurück – sonst hängt ChatGPT ewig
  return { code: input, clientId: row.clientId, clientName: row.clientName, scope: row.scope as KeyScope, redirectUri: row.redirectUri, state: row.state, ip: row.ip, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() };
}
export type PendingOAuth = NonNullable<Awaited<ReturnType<typeof pendingByOAuthCode>>>;

/** Freigeben oder ablehnen – wie decideDevice, aber für den OAuth-Code. */
export async function decideOAuth(userId: string, input: { code: string; approve: boolean; scope?: KeyScope }) {
  const pending = await pendingByOAuthCode(input.code);
  if (!pending) throw new ApiError(404, tk("mcp", "device.notFound"));
  if (!input.approve) {
    await db.oAuthFlow.updateMany({ where: { codeHash: sha256(pending.code), status: "pending" }, data: { status: "denied", userId } });
    // Auch bei Ablehnung zurück zum Programm – dort erscheint access_denied
    return { approved: false, returnTo: oauthReturnUrl(pending.redirectUri, null, pending.state) };
  }
  if ((await db.apiToken.count({ where: { userId } })) >= MAX_TOKENS) throw new ApiError(400, tk("mcp", "errors.limit", { n: MAX_TOKENS }));
  const scope = input.scope ?? pending.scope;
  const { token, hash, hint } = newApiToken();
  const key = await db.apiToken.create({ data: { userId, name: pending.clientName.slice(0, 60), tokenHash: hash, hint, scope } });
  const { count } = await db.oAuthFlow.updateMany({
    where: { codeHash: sha256(pending.code), status: "pending" },
    data: { status: "approved", userId, tokenId: key.id, scope, tokenCipher: encrypt(token), expiresAt: new Date(Math.max(Date.parse(pending.expiresAt), Date.now() + 5 * 60_000)) },
  });
  if (!count) {
    await db.apiToken.delete({ where: { id: key.id } });
    throw new ApiError(409, tk("mcp", "device.notFound"));
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { locale: true } });
  const t = makeT(isLocale(user?.locale) ? user.locale : "de", "mcp");
  await storeInbox(userId, {
    event: "test",
    title: t("device.noticeTitle", { name: pending.clientName }),
    message: `${pending.clientName} · ${hint}${pending.ip ? ` · ${pending.ip}` : ""}`,
    url: "/account#mcp",
  });
  // Der Browser kehrt zum Programm zurück – mit Code (dorthin gehört er, nicht
  // in die Freigabe-Antwort) und dem state des Programms
  return { approved: true, keyId: key.id, scope, returnTo: oauthReturnUrl(pending.redirectUri, pending.code, pending.state) };
}

/** Token-Endpunkt: Prüfung (PKCE, Redirect, Client) und genau einmal ausgeben. */
export async function tokenFor(input: { code: string; code_verifier: string; redirect_uri: string; client_id: string }) {
  const row = await db.oAuthFlow.findUnique({ where: { codeHash: sha256(input.code) } });
  const result = tokenResult(row, input, row?.clientId ?? "");
  if (result.kind === "error" || !row?.tokenCipher) return { error: result.kind === "error" ? result.error : "invalid_grant" } as const;
  const { count } = await db.oAuthFlow.updateMany({ where: { id: row.id, status: "approved" }, data: { status: "claimed", tokenCipher: null } });
  if (!count) return { error: "invalid_grant" } as const;
  // Kein expires_in: der Schlüssel läuft nicht ab. „0“ hieße nach RFC 6749 §5.1
  // „schon abgelaufen“ – Programme würden ihn sofort wieder wegwerfen.
  return { access_token: decrypt(row.tokenCipher), token_type: "Bearer", scope: row.scope } as const;
}

