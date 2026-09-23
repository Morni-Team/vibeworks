import { db } from "@/lib/db";
import { ApiError, json, readBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guard";
import { tk } from "@/lib/i18n/messages";
import { MAX_TOKENS, newApiToken, serializeApiToken } from "@/lib/mcp/token";
import { apiTokenCreateSchema } from "@/lib/validation";
import { limitOrThrow, MINUTE } from "@/lib/security/rateLimit";
import { checkGrantable, notifyOwners } from "@/lib/mcp/projectKeys";
import { keyExpiry } from "@/lib/mcp/projectKeyLogic";

// API-Schlüssel verwalten – nur mit Sitzung, ein Schlüssel kann keine neuen erzeugen.

export const GET = route(async () => {
  const user = await requireApiUser();
  const tokens = await db.apiToken.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  return json({ tokens: tokens.map(serializeApiToken) });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  limitOrThrow(`api-token:${user.id}`, 20, 10 * MINUTE);
  const { name, projects, lifetime, scope } = await readBody(req, apiTokenCreateSchema, { maxBytes: 4096 });
  if ((await db.apiToken.count({ where: { userId: user.id } })) >= MAX_TOKENS) throw new ApiError(400, tk("mcp", "errors.limit", { n: MAX_TOKENS }));
  // Projekt-Schlüssel (#106): nur Projekte, die man freigeben darf
  const granted = projects ? await checkGrantable(user.id, projects) : [];
  const { token, hash, hint } = newApiToken();
  const row = await db.apiToken.create({
    data: {
      userId: user.id,
      name,
      tokenHash: hash,
      hint,
      // Umfang gleich mitspeichern (#192) – vorher galt still „alles“, auch wenn
      // weniger angefragt war. Projekt-Schlüssel bleiben bei höchstens „tasks“.
      ...(scope ? { scope: projects && scope === "all" ? "tasks" : scope } : {}),
      ...(projects ? { projectScoped: true, projectIds: granted.map((p) => p.id), ...(scope ? {} : { scope: "tasks" }) } : {}),
      ...(lifetime ? { expiresAt: keyExpiry(lifetime) } : {}),
    },
  });
  if (granted.length) await notifyOwners(user.id, name, granted);
  // Der Schlüssel im Klartext – nur in dieser einen Antwort
  return json({ token, item: serializeApiToken(row) }, { status: 201 });
});
