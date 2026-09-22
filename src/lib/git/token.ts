import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { decrypt, encrypt } from "@/lib/crypto";
import { tk } from "@/lib/i18n/messages";
import { FetchBlockedError, safeFetch } from "@/lib/security/ssrf";
import { appIssueToken } from "./botApp";
import { botAppInstallUrl, botAppSettingsUrl } from "./botAppLogic";
import { evaluateScopes, parseScopesHeader } from "./tokenCheckLogic";
import { DEFAULT_SERVER, normalizeServer, parseRepoUrl, PROVIDER_LABEL, tokenHint, type GitProvider } from "./parse";

// Welches Token gilt für ein Projekt? Zuerst ein projekteigenes, sonst die
// Git-Verbindung des Besitzers für genau diesen Server (host:port). Ein Token
// geht so nie an einen fremden Server.

export type TokenSource = "project" | "account";

export interface ProjectTokenInput {
  ownerId: string;
  repoUrl: string | null;
  repoTokenCipher: string | null;
}

export async function accountTokenFor(ownerId: string, repoUrl: string | null): Promise<{ cipher: string; hint: string; login: string | null; provider: string } | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;
  return db.gitCredential.findUnique({
    where: { userId_host: { userId: ownerId, host: parsed.hostPort } },
    select: { cipher: true, hint: true, login: true, provider: true },
  });
}

export async function tokenCipherFor(project: ProjectTokenInput): Promise<{ cipher: string; source: TokenSource } | null> {
  if (project.repoTokenCipher) return { cipher: project.repoTokenCipher, source: "project" };
  const account = await accountTokenFor(project.ownerId, project.repoUrl);
  return account ? { cipher: account.cipher, source: "account" } : null;
}

/**
 * Token für Issues: der Bot der Verbindung zu genau diesem Server, falls
 * eingerichtet – als GitHub App (per Klick) oder als eigenes Bot-Konto. So legt
 * VibeWorks Issues nicht unter dem Profil des Besitzers an. Sonst wie gewohnt
 * Projekt- oder Konto-Token. Liefert das Token im Klartext. Mit Bot-App, aber
 * ohne Installation in diesem Repository auch den Installations-Link –
 * dann läuft es (mit Hinweis) über den eigenen Zugang.
 */
export async function issueTokenFor(project: ProjectTokenInput): Promise<{
  token: string;
  source: TokenSource | "bot";
  botLogin: string | null;
  /** Bot-App fehlt in diesem Repository – hier lässt sie sich installieren */
  botInstallUrl: string | null;
} | null> {
  // Hinweis: source „bot“ heißt, Issues laufen nicht unter dem Konto des Besitzers
  const parsed = parseRepoUrl(project.repoUrl);
  if (parsed) {
    const bot = await db.gitCredential.findUnique({
      where: { userId_host: { userId: project.ownerId, host: parsed.hostPort } },
      select: { botCipher: true, botAppId: true, botAppKeyCipher: true, botLogin: true, botAppSlug: true },
    });
    if (bot?.botAppId && bot.botAppKeyCipher) {
      // Nicht in diesem Repository installiert: wie früher über den eigenen Zugang –
      // aber mit Link, damit man die Installation nachholen kann (Identität bleibt sonst der Besitzer)
      const token = await appIssueToken({ botAppId: bot.botAppId, botAppKeyCipher: bot.botAppKeyCipher }, parsed);
      if (token) return { token, source: "bot", botLogin: bot.botLogin, botInstallUrl: null };
      // Ohne eigenen Zugang gibt es hier nichts zu holen: lieber null als ein
      // leeres Token, sonst liefe die Anfrage in ein 401 statt in die Meldung
      // „braucht einen Zugang“
      const fallback = await fallbackIssueToken(project);
      return fallback
        ? { token: fallback, source: "account" as const, botLogin: null, botInstallUrl: bot.botAppSlug ? botAppInstallUrl(bot.botAppSlug) : null }
        : null;
    } else if (bot?.botCipher) {
      const token = tryDecrypt(bot.botCipher);
      if (token) return { token, source: "bot", botLogin: bot.botLogin, botInstallUrl: null };
    }
  }
  const stored = await tokenCipherFor(project);
  const token = stored && tryDecrypt(stored.cipher);
  return stored && token ? { token, source: stored.source, botLogin: null, botInstallUrl: null } : null;
}

/** Konto- oder Projekt-Zugang als Rückfallebene – null ohne Zugang. */
async function fallbackIssueToken(project: ProjectTokenInput): Promise<string | null> {
  const stored = await tokenCipherFor(project);
  return stored ? tryDecrypt(stored.cipher) : null;
}

/** Eigener Git-Zugang einer Person für den Server dieses Repositories (#76) – im Klartext. */
export async function userIssueToken(userId: string, repoUrl: string | null): Promise<string | null> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return null;
  const cred = await db.gitCredential.findUnique({ where: { userId_host: { userId, host: parsed.hostPort } }, select: { cipher: true, provider: true } });
  return cred && cred.provider !== "git" ? tryDecrypt(cred.cipher) : null;
}

function tryDecrypt(cipher: string): string | null {
  try {
    return decrypt(cipher);
  } catch {
    return null;
  }
}

// ── Verbindungen prüfen und anlegen ─────────────────────────

export class GitTokenError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fragt beim Anbieter nach, wem das Token gehört – und prüft es damit zugleich. */
export async function whoAmI(provider: GitProvider, baseUrl: string, token: string): Promise<string | null> {
  return (await probeToken(provider, baseUrl, token)).login;
}

/** Wem gehört der Token, und welche Rechte hat er? (#98) Wirft GitTokenError, wenn er nicht gilt. */
export async function probeToken(provider: GitProvider, baseUrl: string, token: string): Promise<{ login: string | null; scopes: string[] | null }> {
  const label = PROVIDER_LABEL[provider];
  const url =
    provider === "github"
      ? baseUrl === "https://github.com"
        ? "https://api.github.com/user"
        : `${baseUrl}/api/v3/user`
      : provider === "gitlab"
        ? `${baseUrl}/api/v4/user`
        : `${baseUrl}/api/v1/user`;
  const auth: Record<string, string> =
    provider === "github" ? { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" } : provider === "gitlab" ? { "PRIVATE-TOKEN": token } : { Authorization: `token ${token}` };

  let res: Response;
  try {
    res = await safeFetch(url, { headers: { Accept: "application/json", "User-Agent": "VibeWorks", ...auth } });
  } catch (err) {
    if (err instanceof FetchBlockedError) throw new GitTokenError(err.message, 400);
    throw new GitTokenError(tk("git", "errors.hostUnreachable", { host: new URL(baseUrl).host }), 502);
  }
  // Meldungen sind Übersetzungsschlüssel; route() übersetzt sie in die Sprache der Anfrage.
  if (res.status === 401 || res.status === 403) throw new GitTokenError(tk("git", "errors.tokenUnknown", { provider: label }), 400);
  if (res.status === 404) throw new GitTokenError(tk("git", "errors.noProvider", { provider: label }), 400);
  if (!res.ok) throw new GitTokenError(tk("git", "errors.providerHttp", { provider: label, status: res.status }), 502);
  let data: { login?: string; username?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new GitTokenError(tk("git", "errors.noProvider", { provider: label }), 400);
  }
  // Ohne Namen bleibt das Feld leer – die Oberfläche zeigt dann einfach keinen an.
  const login = data.login ?? data.username ?? null;
  let scopes: string[] | null = null;
  if (provider === "github") scopes = parseScopesHeader(res.headers.get("x-oauth-scopes"));
  else if (provider === "gitlab") {
    const self = await safeFetch(`${baseUrl}/api/v4/personal_access_tokens/self`, { headers: { Accept: "application/json", "User-Agent": "VibeWorks", ...auth } }).catch(() => null);
    const body = self?.ok ? ((await self.json().catch(() => null)) as { scopes?: unknown } | null) : null;
    scopes = Array.isArray(body?.scopes) ? body.scopes.filter((s): s is string => typeof s === "string") : null;
  }
  return { login, scopes };
}

/** Prüft das Token und liefert die Felder für db.gitCredential.create/upsert (ohne userId). */
export async function credentialData(provider: GitProvider, server: string, token: string) {
  const norm = normalizeServer(server || DEFAULT_SERVER[provider]);
  if (!norm) throw new GitTokenError(tk("git", "errors.badServer"), 400);
  // Ein beliebiger Git-Server hat keine API zum Nachfragen – das Token zeigt sich beim ersten Abgleich.
  const probe = provider === "git" ? { login: null, scopes: null } : await probeToken(provider, norm.baseUrl, token);
  const report = evaluateScopes(provider, token, probe.scopes);
  return {
    provider,
    host: norm.hostPort,
    baseUrl: norm.baseUrl,
    cipher: encrypt(token),
    hint: tokenHint(token),
    login: probe.login,
    scopes: probe.scopes ?? [],
    scopeKind: report.kind,
    checkedAt: new Date(),
    checkError: null,
  };
}

/**
 * Für Registrierung und Einrichtung: ohne Token nichts, sonst eine geprüfte
 * Verbindung als verschachteltes create für db.user.create. Fehler landen als
 * Feldfehler „gitToken“ im Formular – bevor ein Konto entsteht.
 */
export async function optionalCredential(input: { gitToken: string | null; gitProvider: GitProvider; gitServer: string }) {
  if (!input.gitToken) return {};
  try {
    return { gitCredentials: { create: await credentialData(input.gitProvider, input.gitServer, input.gitToken) } };
  } catch (err) {
    if (err instanceof GitTokenError) throw new ApiError(err.status, err.message, { gitToken: err.message });
    throw err;
  }
}

export async function credentialList(userId: string) {
  const rows = await db.gitCredential.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map((c) => ({
    id: c.id,
    provider: c.provider as GitProvider,
    host: c.host,
    baseUrl: c.baseUrl,
    hint: c.hint,
    login: c.login,
    botHint: c.botHint,
    botLogin: c.botLogin,
    /** Bot als GitHub App: Kurzname und Links zum Installieren und Löschen */
    botApp: c.botAppSlug ? { slug: c.botAppSlug, installUrl: botAppInstallUrl(c.botAppSlug), settingsUrl: botAppSettingsUrl(c.botAppSlug) } : null,
    /** Bot per Klick geht nur mit github.com */
    botAppPossible: c.provider === "github" && c.baseUrl === "https://github.com",
    autoImport: c.autoImport,
    importedAt: c.importedAt?.toISOString() ?? null,
    importError: c.importError,
    importCount: c.importCount,
    /** Rechte-Prüfung (#98) */
    check: {
      at: c.checkedAt?.toISOString() ?? null,
      error: c.checkError,
      kind: c.scopeKind,
      scopes: c.scopes,
      ...(c.provider === "github" || c.provider === "gitlab" ? evaluateScopesView(c.provider, c.scopeKind, c.scopes) : { missing: [], optionalMissing: [] }),
    },
  }));
}
function evaluateScopesView(provider: string, kind: string | null, scopes: string[]) {
  // Ohne bekannte Rechte (feingranular, noch nicht geprüft) nichts behaupten
  if (kind !== "classic" && kind !== "gitlab") return { missing: [] as string[], optionalMissing: [] as Array<{ scope: string; feature: "workflow" | "webhook" }> };
  const r = evaluateScopes(provider, kind === "classic" ? "ghp_" : "glpat", scopes);
  return { missing: r.missing, optionalMissing: r.optionalMissing };
}

export type GitConnectionView = Awaited<ReturnType<typeof credentialList>>[number];
