import type { Task } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api";
import { issueContext } from "@/lib/git/issues";
import { BOT_MARKER, REPLY_MARKER } from "@/lib/git/botCommandsLogic";
import { botAppSettingsUrl } from "@/lib/git/botAppLogic";
import { GitError } from "@/lib/git/providers";
import { tk } from "@/lib/i18n/messages";

// Unterhaltung im Issue einer Aufgabe (#76) – für die Oberfläche und die KI
// (#106). Geschrieben wird über den Issue-Zugang des Projekts (Bot, sonst
// Besitzer), mit dem Namen dessen, der schreibt.

const clean = (body: string) => body.replace(BOT_MARKER, "").replace(REPLY_MARKER, "").trim().slice(0, 4000);

async function contextFor(projectId: string) {
  const ctx = await issueContext(projectId);
  if (!ctx) throw new ApiError(400, tk("tasks", "info.conversation.noSync"));
  return ctx;
}

export async function taskComments(task: Pick<Task, "projectId" | "issueNumber">) {
  if (!task.issueNumber) return [];
  const ctx = await contextFor(task.projectId);
  try {
    const comments = await ctx.api.comments(task.issueNumber);
    return comments.slice(-50).map((c) => ({
      id: c.id,
      author: c.author,
      body: clean(c.body),
      at: c.createdAt,
      url: c.url,
      bot: c.body.includes(BOT_MARKER),
      fromVibeWorks: c.body.includes(REPLY_MARKER),
    }));
  } catch (err) {
    throw new ApiError(502, err instanceof GitError ? err.message : tk("git", "errors.issueFailed"));
  }
}

/** Antwort ins Issue – wer schreibt, steht sichtbar dabei (Person oder KI mit Schlüsselname). */
export async function postTaskComment(task: Pick<Task, "projectId" | "issueNumber">, author: string, text: string): Promise<{ viaBot: boolean; botLogin: string | null; botInstallUrl: string | null }> {
  if (!task.issueNumber) throw new ApiError(400, tk("tasks", "info.conversation.noIssue"));
  const ctx = await contextFor(task.projectId);
  const body = `**${author}** (über VibeWorks):\n\n${text}\n\n${REPLY_MARKER}`;
  try {
    await ctx.api.comment(task.issueNumber, body);
  } catch (err) {
    // 403 unter dem Bot: meist fehlen der Bot-App Rechte – Hinweis mit Link zur
    // App-Einstellung, wo Berechtigungen erneut freigegeben werden können
    if (err instanceof GitError && err.status === 403 && ctx.viaBot && ctx.botLogin?.endsWith("[bot]")) {
      const url = botAppSettingsUrl(ctx.botLogin.replace(/\[bot\]$/, ""));
      throw new ApiError(502, tk("tasks", "info.conversation.botForbidden", { url }));
    }
    throw new ApiError(502, err instanceof GitError ? err.message : tk("git", "errors.issueFailed"));
  }
  // Identität transparent machen: ohne Bot schreibt der Kommentar unter dem Konto des Besitzers
  return { viaBot: ctx.viaBot, botLogin: ctx.botLogin, botInstallUrl: ctx.botInstallUrl };
}
