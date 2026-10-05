import { db } from "@/lib/db";

// Onboarding (#100): Was ist noch offen, damit VibeWorks rund läuft? Jeder
// Schritt prüft den echten Stand – nichts wird abgehakt, was nicht stimmt.

const ONBOARDING_STEPS = ["git", "repoProject", "apiKey", "rules", "bot", "secondFactor", "notify", "errorInbox", "team"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const STEP_LINKS: Record<OnboardingStep, string> = {
  git: "/account#git-zugang",
  repoProject: "/",
  apiKey: "/account#mcp",
  rules: "/account#mcp",
  bot: "/account#git-zugang",
  secondFactor: "/account#passkeys",
  notify: "/account#benachrichtigungen",
  errorInbox: "/",
  team: "/teams",
};

export interface OnboardingState {
  steps: Array<{ key: OnboardingStep; done: boolean; href: string }>;
  hideDone: boolean;
  dismissed: boolean;
}

export interface OnboardingPrefs {
  hideDone?: boolean;
  dismissed?: boolean;
}

export const readPrefs = (raw: unknown): Required<OnboardingPrefs> => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { hideDone: o.hideDone === true, dismissed: o.dismissed === true };
};

/** Leerer Zustand – reicht, solange die Karte ausgeblendet ist. */
const AUSGEBLENDET: OnboardingState = {
  steps: ONBOARDING_STEPS.map((key) => ({ key, done: false, href: STEP_LINKS[key] })),
  hideDone: false,
  dismissed: true,
};

export async function onboardingFor(userId: string): Promise<OnboardingState> {
  // Wer die Karte weggeklickt hat, braucht die Prüfungen nicht: Das sparte auf
  // dem Dashboard elf Abfragen je Aufruf (#214).
  const vorab = await db.user.findUnique({ where: { id: userId }, select: { onboarding: true } });
  if (readPrefs(vorab?.onboarding).dismissed) return AUSGEBLENDET;

  const [user, git, bot, repoProject, apiKey, rules, passkeys, notify, errorInbox, team, firstProject] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { totpEnabledAt: true, onboarding: true } }),
    db.gitCredential.count({ where: { userId } }),
    db.gitCredential.count({ where: { userId, OR: [{ botAppId: { not: null } }, { botCipher: { not: null } }] } }),
    db.project.count({ where: { ownerId: userId, repoUrl: { not: null } } }),
    db.apiToken.count({ where: { userId } }),
    db.apiToken.count({ where: { userId, rulesAckAt: { not: null } } }),
    db.passkey.count({ where: { userId } }),
    db.notificationSettings.findUnique({ where: { userId }, select: { ntfyUrl: true, webhookUrl: true, email: true } }),
    db.project.count({ where: { ownerId: userId, errorKey: { not: null } } }),
    db.teamMember.count({ where: { userId } }),
    // Fehler-Eingang und Repository stellt man im Projekt ein – dorthin verlinken
    db.project.findFirst({ where: { ownerId: userId, buriedAt: null }, select: { id: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const done: Record<OnboardingStep, boolean> = {
    git: git > 0,
    repoProject: repoProject > 0,
    apiKey: apiKey > 0,
    rules: rules > 0,
    bot: bot > 0,
    secondFactor: Boolean(user?.totpEnabledAt) || passkeys > 0,
    notify: Boolean(notify?.ntfyUrl || notify?.webhookUrl || notify?.email),
    errorInbox: errorInbox > 0,
    team: team > 0,
  };
  const prefs = readPrefs(user?.onboarding);
  const links: Record<OnboardingStep, string> = firstProject
    ? { ...STEP_LINKS, repoProject: `/projects/${firstProject.id}`, errorInbox: `/projects/${firstProject.id}` }
    : STEP_LINKS;
  return { steps: ONBOARDING_STEPS.map((key) => ({ key, done: done[key], href: links[key] })), ...prefs };
}
