// Teams ohne Datenbank: Rollen zusammenführen und prüfen, ob ein Team nach dem
// Gehen, Entfernen oder Umstufen noch jemanden hat, der es verwalten darf.

const TEAM_ROLES = ["ADMIN", "MEMBER"] as const;
type TeamRole = (typeof TEAM_ROLES)[number];
export type ShareRole = "VIEWER" | "EDITOR";

export const MAX_TEAM_NAME = 60;
/** So vielen Teams kann ein Konto höchstens angehören (Schutz vor Missbrauch). */
export const MAX_TEAMS = 50;

/** Stärkste Rolle aus direkter Mitgliedschaft und Team-Freigaben – null ohne Zugriff. */
export function bestRole(roles: ShareRole[]): ShareRole | null {
  if (!roles.length) return null;
  return roles.includes("EDITOR") ? "EDITOR" : "VIEWER";
}

/** manager: darf das Team verwalten (Recht „team.manage“). */
type Member = { userId: string; manager: boolean };

/**
 * Was passiert, wenn dieses Mitglied das Team verlässt (oder entfernt wird)?
 * ok · lastAdmin (es bleiben Mitglieder, aber niemand darf mehr verwalten –
 * vorher jemanden befördern) · lastMember (das Team wäre leer – es wird gelöscht)
 */
export function leaveOutcome(members: Member[], userId: string): "ok" | "lastAdmin" | "lastMember" {
  const me = members.find((m) => m.userId === userId);
  if (!me) return "ok";
  if (members.length === 1) return "lastMember";
  if (me.manager && !members.some((m) => m.userId !== userId && m.manager)) return "lastAdmin";
  return "ok";
}

/** Einem Verwalter das Verwalten nehmen geht nur, wenn danach noch jemand verwalten darf. */
export function canDemote(members: Member[], userId: string): boolean {
  return members.some((m) => m.userId !== userId && m.manager);
}
