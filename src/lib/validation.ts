import "./zodSetup";
import { z } from "zod";
import { PROJECT_ACCENTS } from "./status";
import { normalizeTags } from "./utils";
import { tk } from "./i18n/messages";
import { CAUSES } from "./grave";
import { CURRENCIES, INTERVALS } from "./costs";
import { KEY_LIFETIMES, MAX_KEY_PROJECTS } from "./mcp/projectKeyLogic";
import { KEY_SCOPES } from "./mcp/keySettings";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, tk("validation", "username.min"))
  .max(32, tk("validation", "username.max"))
  .regex(/^[a-z0-9._-]+$/, tk("validation", "username.chars"));

const password = z.string().min(1, tk("validation", "passwordMissing")).max(256);
const displayName = z.string().trim().max(60).optional().transform((v) => v || undefined);

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, tk("validation", "username.missing")).max(64),
  password,
});

const gitProviderSchema = z.enum(["github", "gitlab", "gitea", "git"]);

// Optionale Git-Verbindung beim Anlegen eines Kontos – leeres Token heißt „keine“.
const optionalGitConnection = {
  gitToken: z
    .string()
    .trim()
    .max(500, tk("validation", "token.tooLong"))
    .regex(/^[\x21-\x7e]*$/, tk("validation", "token.invalidChars"))
    .optional()
    .transform((v) => v || null),
  gitProvider: gitProviderSchema.default("github"),
  gitServer: z.string().trim().max(300).default(""),
};

export const setupSchema = z.object({
  username: usernameSchema,
  displayName,
  password,
  ...optionalGitConnection,
  mode: z.enum(["SINGLE", "MULTI"]),
  allowRegistration: z.boolean().default(false),
});

export const registerSchema = z.object({
  username: usernameSchema,
  /** Code aus einem Einladungslink – dann auch bei geschlossener Registrierung */
  invite: z.string().regex(/^[\w-]{16,64}$/).optional(),
  displayName,
  password,
  ...optionalGitConnection,
});

// ── Projekte ────────────────────────────────────────────────

export const projectStatusSchema = z.enum(["IDEA", "PLANNING", "OPEN", "IN_PROGRESS", "DONE", "ARCHIVED"]);
const accentSchema = z.enum(Object.keys(PROJECT_ACCENTS) as [string, ...string[]]);
const tagsSchema = z.union([z.array(z.string().max(64)).max(50), z.string().max(1000)]).transform((t) => normalizeTags(t));
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform((v) => (v?.trim() ? v : null));

const repoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || /^(https?:\/\/|git@)[^\s]+$/.test(v), tk("validation", "repoUrl"));

const liveUrlSchema = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\/[^\s/]+[^\s]*$/.test(v), tk("validation", "liveUrl"));

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, tk("validation", "nameMissing")).max(120, tk("validation", "nameMax120")),
  summary: optionalText(240),
  description: optionalText(20_000),
  status: projectStatusSchema.default("IDEA"),
  priority: z.number().int().min(1).max(4).default(2),
  progress: z.number().int().min(0).max(100).default(0),
  accent: accentSchema.default("violet"),
  tags: tagsSchema.default([]),
  favorite: z.boolean().default(false),
  progressFromTasks: z.boolean().default(false),
  repoUrl: repoUrlSchema,
  liveUrl: liveUrlSchema,
});

// Für PATCH: alles optional und OHNE Standardwerte. zod 4 setzt .default()
// auch in optionalen Feldern ein – ein Umbenennen würde sonst Status,
// Fortschritt, Farbe, Tags und Favorit auf die Anfangswerte zurücksetzen.
export const projectUpdateSchema = projectCreateSchema.partial().extend({
  status: projectStatusSchema.optional(),
  priority: z.number().int().min(1).max(4).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  accent: accentSchema.optional(),
  tags: tagsSchema.optional(),
  favorite: z.boolean().optional(),
  progressFromTasks: z.boolean().optional(),
});
/** Bearbeiten über die Oberfläche: bei Projekten mit Stern bestätigt confirmProtected Status-/Repository-Änderungen. */
export const projectPatchSchema = projectUpdateSchema.extend({ confirmProtected: z.boolean().optional() });

// ── Portfolio ───────────────────────────────────────────────

export const portfolioSchema = z.object({
  public: z.boolean(),
  bio: z.string().max(1000).nullish().transform((v) => v?.trim() || null),
  projectIds: z.array(z.string().max(40)).max(500).default([]),
});

// ── Ideen-Eingang ───────────────────────────────────────────

export const inboxAddSchema = z.object({
  text: z.string().max(4000).refine((v) => v.trim().length > 0, tk("inbox", "errors.empty")),
  url: z.string().trim().max(1000).nullish().transform((v) => (v && /^https?:\/\//i.test(v) ? v : null)),
  source: z.enum(["manual", "share"]).default("manual"),
});

export const inboxActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("project") }),
  z.object({ action: z.literal("task"), projectId: z.string().min(1).max(40) }),
]);

export const inboxSettingsSchema = z.object({
  ntfyUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/[^/\s]+\/[\w-]{1,64}\/?$/.test(v), tk("notify", "errors.badNtfyUrl")),
  regenerate: z.boolean().default(false),
});

// ── Kosten ──────────────────────────────────────────────────

const dayKeyOrNull = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), tk("validation", "invalidDate"));

export const costSchema = z.object({
  name: z.string().trim().min(1, tk("validation", "nameMissing")).max(80),
  // „12,99“ oder 12.99 – gespeichert in Cent
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => Number(String(v).trim().replace(/\s/g, "").replace(",", ".")))
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 10_000_000, tk("costs", "errors.amount"))
    .transform((v) => Math.round(v * 100)),
  currency: z.enum(CURRENCIES).default("EUR"),
  interval: z.enum(INTERVALS).default("MONTHLY"),
  renewsOn: dayKeyOrNull,
  note: z.string().trim().max(500).nullish().transform((v) => v || null),
});

// ── Prompts ─────────────────────────────────────────────────

export const promptSchema = z.object({
  title: z.string().trim().min(1, tk("validation", "titleMissing")).max(120),
  body: z.string().max(20_000).refine((v) => v.trim().length > 0, tk("prompts", "errors.bodyEmpty")),
  tags: tagsSchema.default([]),
  projectId: z.string().max(40).nullish().transform((v) => v || null),
});

// PATCH ohne Standardwerte – sonst leerte zod 4 beim Umbenennen die Tags
export const promptUpdateSchema = promptSchema.partial().extend({ tags: tagsSchema.optional() });

// ── Heute ───────────────────────────────────────────────────

export const todayFocusSchema = z.object({ taskId: z.string().min(1).max(40) });

// ── Projekt-Friedhof ────────────────────────────────────────

export const graveActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("bury"),
    cause: z.enum(CAUSES).nullish(),
    epitaph: z.string().trim().max(200).nullish(),
  }),
  z.object({ action: z.literal("resurrect") }),
  z.object({ action: z.literal("snooze") }),
  z.object({ action: z.literal("continue") }),
]);

// ── API-Schlüssel ───────────────────────────────────────────

export const apiTokenCreateSchema = z.object({
  name: z.string().trim().min(1, tk("mcp", "errors.nameMissing")).max(60),
  /** Projekt-Schlüssel (#106): nur diese Projekte – fehlt die Liste, gilt der Schlüssel für alle */
  projects: z.array(z.string().min(1).max(40)).min(1).max(MAX_KEY_PROJECTS).optional(),
  lifetime: z.enum(KEY_LIFETIMES).optional(),
  /** Umfang gleich beim Anlegen (#192): sonst galt still „alles“, auch wenn weniger angefragt war */
  scope: z.enum(KEY_SCOPES).optional(),
});

// ── Benachrichtigungen ──────────────────────────────────────

const optionalText254 = z.string().trim().max(254).nullish().transform((v) => v || null);

export const notificationSettingsSchema = z.object({
  ntfyUrl: z
    .string()
    .trim()
    .max(500)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/[^/\s]+\/[\w-]{1,64}\/?$/.test(v), tk("notify", "errors.badNtfyUrl")),
  // undefined = behalten, null = entfernen
  ntfyToken: z.string().trim().max(300).nullable().optional(),
  /** Kritisches (Fehler, Seite down, Geheimnis im Repo) mit höchster ntfy-Priorität – kommt auch bei „Nicht stören“ durch */
  urgentCritical: z.boolean().default(true),
  webhookUrl: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/\S+$/.test(v), tk("notify", "errors.badWebhookUrl")),
  email: optionalText254.refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), tk("notify", "errors.badEmail")),
  events: z.record(z.string(), z.boolean()).default({}),
});

export const smtpSettingsSchema = z.object({
  host: z.string().trim().max(253).nullish().transform((v) => v || null),
  port: z.number().int().min(1).max(65535).nullish(),
  secure: z.boolean().default(false),
  user: optionalText254,
  // undefined = behalten, null = entfernen
  password: z.string().max(500).nullable().optional(),
  from: optionalText254,
});

export const smtpTestSchema = z.object({ to: z.string().trim().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, tk("notify", "errors.badEmail")) });

// Anlegen mit Vorlage: "builtin:web" oder die ID einer eigenen Vorlage
export const projectCreateWithTemplateSchema = projectCreateSchema.extend({ templateId: z.string().max(60).optional() });

export const templateCreateSchema = z.object({
  projectId: z.string().max(40),
  name: z.string().trim().min(1, tk("validation", "nameMissing")).max(80),
  description: z.string().trim().max(300).nullish(),
});

export const repoAccessSchema = z.object({
  /** Neue Issues übernehmen (#69) */
  issueImport: z.enum(["off", "trusted", "all"]).optional(),
  /** GitHub-Konten mit Rolle (#69) */
  gitPeople: z
    .array(z.object({ login: z.string().trim().max(100), role: z.enum(["worker", "bughunter"]) }))
    .max(50)
    .optional(),
  issuesRetry: z.boolean().optional(),
  // null entfernt das Token, undefined lässt es stehen
  token: z
    .string()
    .trim()
    .min(8, tk("validation", "token.tooShort"))
    .max(500, tk("validation", "token.tooLong"))
    .regex(/^[\x21-\x7e]+$/, tk("validation", "token.invalidChars"))
    .nullable()
    .optional(),
  issueSync: z.boolean().optional(),
  // Webhook: einrichten, Geheimnis erneuern, entfernen oder beim Anbieter eintragen
  webhook: z.enum(["on", "renew", "off", "install"]).optional(),
});

export const gitCredentialSchema = z.object({
  provider: gitProviderSchema,
  // Leer = Standardserver des Anbieters (github.com, gitlab.com)
  server: z.string().trim().max(300, tk("validation", "serverTooLong")).default(""),
  token: z
    .string()
    .trim()
    .min(8, tk("validation", "token.tooShort"))
    .max(500, tk("validation", "token.tooLong"))
    .regex(/^[\x21-\x7e]+$/, tk("validation", "token.invalidChars")),
});

const gitCredentialUpdateSchema = z.object({ autoImport: z.boolean() });

// ── Teilen ──────────────────────────────────────────────────

const projectRoleSchema = z.enum(["VIEWER", "EDITOR"]);

export const shareLinkSchema = z.object({ link: z.enum(["on", "off", "renew"]) });

const roleIdSchema = z.string().min(1).max(40);

export const memberAddSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, tk("validation", "username.missing")).max(64),
  /** Rolle (src/lib/rolesLogic.ts) – ohne Angabe gilt die alte Stufe */
  roleId: roleIdSchema.optional(),
  role: projectRoleSchema.default("VIEWER"),
});

export const memberUpdateSchema = z.object({ roleId: roleIdSchema.optional(), role: projectRoleSchema.optional() });

export const accessRequestSchema = z.object({
  role: projectRoleSchema.default("VIEWER"),
  message: optionalText(500),
});

export const accessDecisionSchema = z.object({
  decision: z.enum(["approve", "deny"]),
  roleId: roleIdSchema.optional(),
  role: projectRoleSchema.optional(),
});

export const projectReorderSchema = z.object({
  status: projectStatusSchema,
  ids: z.array(z.string().max(40)).max(1000),
});

export const projectBulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), ids: z.array(z.string().max(40)).min(1).max(500), status: projectStatusSchema, confirmProtected: z.boolean().optional() }),
  z.object({ action: z.literal("addTags"), ids: z.array(z.string().max(40)).min(1).max(500), tags: tagsSchema }),
  z.object({ action: z.literal("removeTags"), ids: z.array(z.string().max(40)).min(1).max(500), tags: tagsSchema }),
  z.object({ action: z.literal("favorite"), ids: z.array(z.string().max(40)).min(1).max(500), favorite: z.boolean() }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string().max(40)).min(1).max(500) }),
]);

// ── Notizen ─────────────────────────────────────────────────

export const noteCreateSchema = z.object({
  title: optionalText(200),
  content: z.string().max(50_000, tk("validation", "note.tooLong")).refine((v) => v.trim().length > 0, tk("validation", "note.empty")),
  pinned: z.boolean().default(false),
});

export const noteUpdateSchema = z.object({
  // .optional() außen: ein fehlender Titel bleibt undefined („nicht ändern“)
  // und wird nicht zu null („Titel löschen“).
  title: optionalText(200).optional(),
  content: z.string().max(50_000).refine((v) => v.trim().length > 0, tk("validation", "note.empty")).optional(),
  pinned: z.boolean().optional(),
});

// ── Aufgaben ────────────────────────────────────────────────

export const taskStatusSchema = z.enum(["TODO", "DOING", "BLOCKED", "DONE"]);
export const recurrenceSchema = z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);

const dueDateSchema = z
  .union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, tk("validation", "date.format"))
      .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), tk("validation", "date.invalid")),
    z.literal(""),
  ])
  .nullish()
  .transform((v) => v || null);

/** Bearbeiter: frei eingetragen, z. B. „anna“ oder „Claude“ */
const assigneeSchema = z.string().trim().max(60);

const labelsSchema = z.union([z.array(z.string().max(40)).max(30), z.string().max(500)]).transform((t) => normalizeTags(t, 8));

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, tk("validation", "titleMissing")).max(200, tk("validation", "titleMax200")),
  description: optionalText(20_000),
  status: taskStatusSchema.default("TODO"),
  dueDate: dueDateSchema,
  labels: labelsSchema.default([]),
  recurrence: recurrenceSchema.nullish().transform((v) => v ?? null),
  assignee: assigneeSchema.nullish().transform((v) => v || null),
  priority: z.number().int().min(1).max(4).default(2),
  aiLocked: z.boolean().default(false),
  /** Zusatz-Spalte (#76) */
  column: z.string().regex(/^x[1-9]$/).nullish().transform((v) => v ?? null),
});

// Dieselbe Aufgabe für mehrere Projekte (Aufgabenübersicht, MCP)
export const taskBulkSchema = taskCreateSchema.pick({ title: true, description: true, dueDate: true, labels: true }).extend({
  projectIds: z.array(z.string().max(40)).min(1, tk("tasks", "overview.bulk.noProjects")).max(200),
});

// Alles außen .optional(): Fehlendes heißt „nicht ändern“, nicht „leeren“.
export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, tk("validation", "titleMissing")).max(200).optional(),
  description: optionalText(20_000).optional(),
  status: taskStatusSchema.optional(),
  dueDate: dueDateSchema.optional(),
  labels: labelsSchema.optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  assignee: assigneeSchema
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
  priority: z.number().int().min(1).max(4).optional(),
  aiNote: optionalText(4000).optional(),
  aiLocked: z.boolean().optional(),
  column: z.string().regex(/^x[1-9]$/).nullable().optional(),
});

export const taskReorderSchema = z.object({
  status: taskStatusSchema,
  /** Zusatz-Spalte, in die sortiert wird – null/fehlend: die Grundspalte */
  column: z.string().regex(/^x[1-9]$/).nullish().transform((v) => v ?? null),
  ids: z.array(z.string().max(40)).max(2000),
});

// ── Mein Konto ──────────────────────────────────────────────

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(60, tk("validation", "displayNameMax60"))
    .nullish()
    .transform((v) => v || null)
    .optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), tk("validation", "emailInvalid"))
    .optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().max(256).optional(),
  newPassword: z.string().min(1, tk("validation", "newPasswordMissing")).max(256),
});

// ── Zwei-Faktor ─────────────────────────────────────────────

export const totpCodeSchema = z.object({ code: z.string().trim().min(1, tk("validation", "codeMissing")).max(20) });

export const confirmIdentitySchema = z.object({
  password: z.string().max(256).optional(),
  code: z.string().trim().max(20).optional(),
});

/** E-Mail als Notfallweg umschalten (#109) – mit Bestätigung der Identität */
export const mfaEmailSchema = z.object({
  mfaEmail: z.boolean(),
  password: z.string().max(200).optional(),
  code: z.string().trim().max(20).optional(),
});

export const mfaLoginSchema = z
  .object({
    code: z.string().trim().max(20).optional(),
    recoveryCode: z.string().trim().max(40).optional(),
    /** Notfall-Code aus der E-Mail (#109) */
    emailCode: z.string().trim().max(20).optional(),
  })
  .refine((v) => v.code || v.recoveryCode || v.emailCode, tk("validation", "codeMissing"));

// ── Passkeys ────────────────────────────────────────────────

// Die eigentliche Prüfung übernimmt SimpleWebAuthn; hier nur Form und Größe.
const webauthnResponseSchema = z
  .object({
    id: z.string().min(1).max(1024),
    rawId: z.string().max(1024),
    type: z.literal("public-key"),
    response: z.record(z.string(), z.unknown()),
    clientExtensionResults: z.record(z.string(), z.unknown()).default({}),
    authenticatorAttachment: z.string().max(40).optional(),
  })
  .passthrough();

export const passkeyRegisterSchema = z.object({
  response: webauthnResponseSchema,
  name: z.string().trim().max(60).optional(),
});

export const passkeyLoginSchema = z.object({ response: webauthnResponseSchema });

export const passkeyRenameSchema = z.object({ name: z.string().trim().min(1, tk("validation", "nameMissing")).max(60, tk("validation", "max60Chars")) });

// ── Administration ──────────────────────────────────────────

export const adminSettingsSchema = z.object({
  mode: z.enum(["SINGLE", "MULTI"]).optional(),
  allowRegistration: z.boolean().optional(),
  allowPasswordReset: z.boolean().optional(),
  taskColumnLimit: z.number().int().min(0, tk("validation", "min0")).max(500, tk("validation", "max500")).optional(),
  wishLimit: z.number().int().min(1).max(20).optional(),
});

export const adminUserCreateSchema = z.object({
  username: usernameSchema,
  displayName,
  password,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const adminUserUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((v) => v || null)
    .optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().max(256).optional(),
  unlock: z.boolean().optional(),
});

// ── Mini-Docs ───────────────────────────────────────────────

export const docCreateSchema = z.object({
  // Art der neuen Seite: gewöhnliche Markdown-Seite oder Leinwand (#211)
  kind: z.enum(["PAGE", "BOARD"]).default("PAGE"),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || "Neue Seite"),
  parentId: z
    .string()
    .max(40)
    .nullish()
    .transform((v) => v || null),
});

// Außen .optional(): Fehlendes heißt „nicht ändern“.
export const docUpdateSchema = z.object({
  title: z.string().trim().min(1, tk("validation", "titleMissing")).max(200, tk("validation", "titleMax200")).optional(),
  icon: z
    .string()
    .trim()
    .max(16)
    .nullish()
    .transform((v) => v || null)
    .optional(),
  content: z.string().max(1_000_000, tk("validation", "maxMillionChars")).optional(),
  parentId: z.string().max(40).nullable().optional(),
  move: z.enum(["up", "down"]).optional(),
  pinned: z.boolean().optional(),
});

/** Nur relative Pfade innerhalb der App als Weiterleitungsziel. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
