import { z } from "zod";
import { db } from "@/lib/db";
import { json, readBody, route } from "@/lib/api";
import { displayNameOf, requireApiUser } from "@/lib/auth/guard";
import { requireTask } from "@/lib/access";
import { postTaskComment, taskComments } from "@/lib/taskComments";
import { limitOrThrow, MINUTE } from "@/lib/security/rateLimit";

type Params = { id: string };

// Unterhaltung im Issue einer Aufgabe (#76): lesen darf, wer das Projekt sieht;
// antworten, wer Aufgaben bearbeiten darf. Geschrieben wird über den
// Issue-Zugang (Bot, sonst Besitzer) – mit Namen der Person aus VibeWorks.

const replySchema = z.object({ text: z.string().trim().min(1).max(5000) });

export const GET = route<Params>(async (_req, { params }) => {
  const user = await requireApiUser();
  const { task } = await requireTask(user.id, (await params).id);
  if (!task.issueNumber) return json({ comments: [], issueUrl: null });
  limitOrThrow(`issue-comments:${user.id}`, 60, MINUTE);
  return json({ issueUrl: task.issueUrl, comments: await taskComments(task) });
});

export const POST = route<Params>(async (req, { params }) => {
  const user = await requireApiUser();
  const { task } = await requireTask(user.id, (await params).id, "tasks.edit");
  const { text } = await readBody(req, replySchema, { maxBytes: 12_000 });
  limitOrThrow(`issue-reply:${user.id}`, 20, 10 * MINUTE);
  const author = await db.user.findUnique({ where: { id: user.id }, select: { username: true, displayName: true } });
  // Wer sichtbar schreibt, gehört in die Antwort (#189): unter dem Bot oder unter dem eigenen Konto
  const { viaBot, botLogin, botInstallUrl } = await postTaskComment(task, displayNameOf(author ?? user), text);
  return json({ ok: true, viaBot, botLogin, botInstallUrl });
});
