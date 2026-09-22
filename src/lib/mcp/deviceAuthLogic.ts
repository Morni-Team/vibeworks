import { randomInt } from "node:crypto";
import { z } from "zod";
import { KEY_SCOPES } from "./keySettings";

// Geräte-Anmeldung für KI-Programme (#104), angelehnt an RFC 8628: Das
// Programm fordert einen Code an, der Kontoinhaber gibt ihn einmal in VibeWorks
// frei, das Programm holt sich danach seinen API-Schlüssel ab. So muss niemand
// Schlüssel kopieren – die Freigabe bleibt aber beim Menschen. Ohne Datenbank.

/** So lange gilt ein Code. */
export const DEVICE_TTL_MS = 10 * 60_000;
/** So oft darf das Programm höchstens nachfragen (Sekunden). */
export const POLL_INTERVAL_S = 5;

// Nur Konsonanten ohne leicht verwechselbare Zeichen – keine zufälligen Wörter, kein 0/O, 1/I
const ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";

export function newUserCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Eingabe des Menschen vereinheitlichen – Klein-/Großschreibung, Leerzeichen und Striche egal. */
export function normalizeUserCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (s.length !== 8 || [...s].some((c) => !ALPHABET.includes(c))) return null;
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

export const deviceStartSchema = z.object({
  client_name: z.string().trim().min(1).max(60),
  scope: z.enum(KEY_SCOPES).default("tasks"),
});

export const deviceTokenSchema = z.object({ device_code: z.string().min(20).max(100) });

export const deviceDecisionSchema = z.object({
  code: z.string().max(20),
  approve: z.boolean(),
  scope: z.enum(KEY_SCOPES).optional(),
});

/** OAuth-Freigabe (#141): längere Codes, sonst derselbe Auftrag. */
export const oauthDecisionSchema = z.object({
  code: z.string().min(10).max(128),
  approve: z.boolean(),
  scope: z.enum(KEY_SCOPES).optional(),
});

type DeviceStatus = "pending" | "approved" | "denied" | "claimed";

export type PollResult =
  | { kind: "error"; error: "authorization_pending" | "slow_down" | "access_denied" | "expired_token" | "invalid_grant" }
  | { kind: "token" };

/** Was eine Nachfrage des Programms ergibt (Fehlercodes wie in RFC 8628). */
export function pollResult(row: { status: string; expiresAt: Date; lastPollAt: Date | null } | null, now = Date.now()): PollResult {
  if (!row || row.status === "claimed") return { kind: "error", error: "invalid_grant" };
  if (row.expiresAt.getTime() <= now) return { kind: "error", error: "expired_token" };
  if (row.status === "denied") return { kind: "error", error: "access_denied" };
  if (row.status === "approved") return { kind: "token" };
  if (row.lastPollAt && now - row.lastPollAt.getTime() < (POLL_INTERVAL_S - 1) * 1000) return { kind: "error", error: "slow_down" };
  return { kind: "error", error: "authorization_pending" };
}

/** Name des neuen Schlüssels – erkennbar als per Gerät verbunden. */
export const deviceKeyName = (clientName: string) => `${clientName.slice(0, 45)} (Gerät)`;
