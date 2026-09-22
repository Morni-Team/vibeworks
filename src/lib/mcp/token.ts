import type { ApiToken } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { keyState } from "./projectKeyLogic";

// API-Schlüssel für Claude Code und andere MCP-Clients. Der Schlüssel selbst
// wird nur einmal beim Erstellen gezeigt; gespeichert ist allein sein
// SHA-256 (256 Bit Zufall – ein langsamer Hash brächte nichts).

const TOKEN_PREFIX = "vw_";
export const MAX_TOKENS = 20;

export function newApiToken() {
  const token = `${TOKEN_PREFIX}${randomToken(32)}`;
  return { token, hash: sha256(token), hint: `${token.slice(0, 7)}…${token.slice(-4)}` };
}

function bearerOf(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(\S+)\s*$/i);
  if (!m || !m[1].startsWith(TOKEN_PREFIX) || m[1].length > 200) return null;
  return m[1];
}

/** Warum ein Schlüssel nicht angenommen wird – als Code im 401 (#25). Unbekannt und widerrufen sind nicht unterscheidbar: widerrufene Zeilen sind gelöscht. */
type ApiTokenProblem = "missing" | "malformed" | "invalid_or_revoked" | "account_inactive" | "paused" | "expired" | "no_projects";

/** Konto zum Bearer-Schlüssel – oder die Ursache, warum nicht. meta: wer gerade anfragt (Prüfspur am Schlüssel). */
export async function checkApiToken(header: string | null, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  if (!header?.trim()) return { problem: "missing" as ApiTokenProblem };
  const token = bearerOf(header);
  if (!token) return { problem: "malformed" as ApiTokenProblem };
  const row = await db.apiToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, username: true, displayName: true, role: true, active: true, locale: true } } },
  });
  if (!row) return { problem: "invalid_or_revoked" as ApiTokenProblem };
  if (!row.user.active) return { problem: "account_inactive" as ApiTokenProblem };
  // Projekt-Schlüssel (#106): pausiert, abgelaufen oder alle Projekte widerrufen
  const state = keyState(row);
  if (state === "paused" || state === "expired") return { problem: state as ApiTokenProblem };
  if (state === "empty") return { problem: "no_projects" as ApiTokenProblem };
  // „Zuletzt benutzt“ samt Adresse und Programm höchstens einmal pro Minute schreiben
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db.apiToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(), lastUsedIp: meta.ip?.slice(0, 64) ?? null, lastUsedUserAgent: meta.userAgent?.slice(0, 300) ?? null } })
      .catch(() => undefined);
  }
  return {
    auth: {
      tokenId: row.id,
      user: row.user,
      rulesAckAt: row.rulesAckAt,
      rulesVersion: row.rulesVersion,
      projectIds: row.projectScoped ? row.projectIds : null,
      settings: { scope: row.scope, reminderMode: row.reminderMode, reminderText: row.reminderText, reminderEvery: row.reminderEvery, reminderUntil: row.reminderUntil },
    },
  };
}

/** Konto zum Bearer-Schlüssel – null bei fehlendem, kaputtem, unbekanntem, widerrufenem Schlüssel oder gesperrtem Konto. */
async function authenticateApiToken(header: string | null) {
  const r = await checkApiToken(header);
  return r.auth ?? null;
}
type ApiTokenAuth = NonNullable<Awaited<ReturnType<typeof authenticateApiToken>>>;

export function serializeApiToken(t: ApiToken) {
  return {
    id: t.id,
    name: t.name,
    hint: t.hint,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    rulesAckAt: t.rulesAckAt?.toISOString() ?? null,
    rulesVersion: t.rulesVersion,
    clientName: t.clientName,
    clientVersion: t.clientVersion,
    clientProtocol: t.clientProtocol,
    lastUsedIp: t.lastUsedIp,
    lastUsedUserAgent: t.lastUsedUserAgent,
    scope: t.scope,
    reminderMode: t.reminderMode,
    reminderText: t.reminderText,
    reminderEvery: t.reminderEvery,
    reminderUntil: t.reminderUntil?.toISOString() ?? null,
    projectScoped: t.projectScoped,
    projectIds: t.projectIds,
    expiresAt: t.expiresAt?.toISOString() ?? null,
    disabledAt: t.disabledAt?.toISOString() ?? null,
    state: keyState(t),
  };
}
export type ApiTokenItem = ReturnType<typeof serializeApiToken>;
