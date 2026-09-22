import type { CommunityMessage, CommunityPost, CommunityReply } from "@/generated/prisma/client";
import { db } from "./db";
import { notFound } from "./api";
import { getSettings } from "./settings";
import { tk } from "./i18n/messages";
import { appLink, notifyUser } from "./notify";
import { hit, MINUTE } from "./security/rateLimit";
import { displayNameOf, type SessionUser } from "./auth/guard";
import { canDelete, canEdit, canModerate, canSee, CHAT_PAGE, LOBBY, type PostKind, type PostStatus, type Viewer } from "./communityLogic";

// Community: Projekte, die ihre Besitzer vorstellen, mit Beiträgen und
// Antworten – nur für angemeldete Konten dieser Instanz, nur im
// Mehrbenutzerbetrieb. Gezeigt werden dieselben Projektangaben wie im
// Portfolio; Zugriff auf das Projekt selbst gibt die Community nicht.

export async function communityOn(): Promise<boolean> {
  return (await getSettings()).mode === "MULTI";
}

export async function viewerOf(user: SessionUser): Promise<Viewer> {
  const row = await db.user.findUnique({ where: { id: user.id }, select: { communityBannedAt: true } });
  return { id: user.id, isAdmin: user.role === "ADMIN", banned: Boolean(row?.communityBannedAt) };
}

/** Für API-Routen: gibt es die Community? Dann das Konto als Betrachter. */
export async function requireCommunity(user: SessionUser): Promise<Viewer> {
  if (!(await communityOn())) throw notFound(tk("community", "errors.off"));
  return viewerOf(user);
}

const projectSelect = {
  id: true,
  name: true,
  summary: true,
  status: true,
  progress: true,
  accent: true,
  tags: true,
  liveUrl: true,
  repoUrl: true,
  communityOfficial: true,
  ownerId: true,
  owner: { select: { username: true, displayName: true } },
} as const;

const visibleProject = { inCommunity: true, buriedAt: null, owner: { active: true } } as const;

export function communityProject(projectId: string) {
  return db.project.findFirst({ where: { id: projectId, ...visibleProject }, select: projectSelect });
}
type CommunityProject = NonNullable<Awaited<ReturnType<typeof communityProject>>>;

export async function requireCommunityProject(projectId: string) {
  const project = await communityProject(projectId);
  if (!project) throw notFound(tk("community", "errors.projectNotFound"));
  return project;
}

export function listCommunityProjects() {
  return db.project.findMany({
    where: visibleProject,
    select: { ...projectSelect, _count: { select: { communityPosts: { where: { hidden: false, status: "open" } } } } },
    orderBy: [{ communityOfficial: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
}

export function myCommunityProjects(userId: string) {
  return db.project.findMany({ where: { ownerId: userId, buriedAt: null }, select: { id: true, name: true, inCommunity: true }, orderBy: { name: "asc" } });
}

/** Feedback-Eingang (#59): Beiträge zu den eigenen Projekten, neueste Aktivität zuerst. */
export async function feedbackInbox(userId: string) {
  const posts = await db.communityPost.findMany({
    where: { project: { ownerId: userId, inCommunity: true, buriedAt: null } },
    orderBy: { lastActivityAt: "desc" },
    take: 60,
    include: { author: authorSelect, project: { select: { id: true, name: true } } },
  });
  return posts.map((p) => ({
    id: p.id,
    projectId: p.project.id,
    project: p.project.name,
    kind: p.kind,
    status: p.status,
    title: p.title,
    author: displayNameOf(p.author),
    replies: p.replyCount,
    at: p.lastActivityAt.toISOString(),
  }));
}

/** Auswahl setzen – per SQL, damit „zuletzt geändert“ der Projekte nicht springt. */
export async function setMyCommunityProjects(userId: string, projectIds: string[]) {
  await db.$executeRaw`UPDATE "Project" SET "inCommunity" = ("id" = ANY(${projectIds}::text[])) WHERE "ownerId" = ${userId}`;
}

export async function bannedHere(projectId: string, userId: string): Promise<boolean> {
  return Boolean(await db.communityBan.findUnique({ where: { projectId_userId: { projectId, userId } }, select: { id: true } }));
}

export const authorSelect = { select: { id: true, username: true, displayName: true } } as const;
type Author = { id: string; username: string; displayName: string | null };

const authorView = (a: Author) => ({ id: a.id, name: displayNameOf(a), username: a.username });

export function serializePost(p: CommunityPost & { author: Author }, v: Viewer, ownerId: string, reports = 0) {
  return {
    id: p.id,
    projectId: p.projectId,
    kind: p.kind as PostKind,
    title: p.title,
    body: p.body,
    status: p.status as PostStatus,
    hidden: p.hidden,
    replyCount: p.replyCount,
    createdAt: p.createdAt.toISOString(),
    edited: p.updatedAt.getTime() - p.createdAt.getTime() > 60_000 && p.body !== "",
    lastActivityAt: p.lastActivityAt.toISOString(),
    author: authorView(p.author),
    byOwner: p.authorId === ownerId,
    canEdit: canEdit(v, p.authorId),
    canDelete: canDelete(v, p.authorId, ownerId),
    /** Offene Meldungen – nur für die Moderation */
    reports: canModerate(v, ownerId) ? reports : 0,
  };
}
export type PostItem = ReturnType<typeof serializePost>;

export function serializeReply(r: CommunityReply & { author: Author }, v: Viewer, ownerId: string, reports = 0) {
  return {
    id: r.id,
    postId: r.postId,
    body: r.body,
    hidden: r.hidden,
    createdAt: r.createdAt.toISOString(),
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
    author: authorView(r.author),
    byOwner: r.authorId === ownerId,
    canEdit: canEdit(v, r.authorId),
    canDelete: canDelete(v, r.authorId, ownerId),
    reports: canModerate(v, ownerId) ? reports : 0,
  };
}
export type ReplyItem = ReturnType<typeof serializeReply>;

async function openReportCounts(targetType: "post" | "reply", ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await db.communityReport.groupBy({ by: ["targetId"], where: { targetType, targetId: { in: ids }, status: "open" }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.targetId, r._count._all]));
}

/** Sichtbare Beiträge: Ausgeblendetes nur für Autor und Moderation. */
const visibleFor = (v: Viewer, moderator: boolean) => (moderator ? {} : { OR: [{ hidden: false }, { authorId: v.id }] });

export async function loadPosts(projectId: string, v: Viewer, ownerId: string) {
  const mod = canModerate(v, ownerId);
  const rows = await db.communityPost.findMany({ where: { projectId, ...visibleFor(v, mod) }, include: { author: authorSelect }, orderBy: { lastActivityAt: "desc" }, take: 200 });
  const reports = mod ? await openReportCounts("post", rows.map((r) => r.id)) : new Map<string, number>();
  return rows.map((r) => serializePost(r, v, ownerId, reports.get(r.id) ?? 0));
}

export async function loadThread(postId: string, v: Viewer) {
  const post = await db.communityPost.findUnique({ where: { id: postId }, include: { author: authorSelect } });
  if (!post) return null;
  const project = await communityProject(post.projectId);
  if (!project || !canSee(v, post, project.ownerId)) return null;
  const mod = canModerate(v, project.ownerId);
  const replies = await db.communityReply.findMany({ where: { postId, ...visibleFor(v, mod) }, include: { author: authorSelect }, orderBy: { createdAt: "asc" }, take: 500 });
  const [postReports, replyReports] = mod
    ? await Promise.all([openReportCounts("post", [post.id]), openReportCounts("reply", replies.map((r) => r.id))])
    : [new Map<string, number>(), new Map<string, number>()];
  return {
    project,
    moderator: mod,
    post: serializePost(post, v, project.ownerId, postReports.get(post.id) ?? 0),
    replies: replies.map((r) => serializeReply(r, v, project.ownerId, replyReports.get(r.id) ?? 0)),
  };
}

/** Beitrag samt Projekt für Änderungen – Projekt muss (noch) in der Community sein. */
export async function postForChange(postId: string) {
  const post = await db.communityPost.findUnique({ where: { id: postId } });
  if (!post) throw notFound(tk("community", "errors.postNotFound"));
  return { post, project: await requireCommunityProject(post.projectId) };
}

export async function replyForChange(replyId: string) {
  const reply = await db.communityReply.findUnique({ where: { id: replyId }, include: { post: true } });
  if (!reply) throw notFound(tk("community", "errors.replyNotFound"));
  return { reply, post: reply.post, project: await requireCommunityProject(reply.post.projectId) };
}

// ── Chat ────────────────────────────────────────────────────

/** Raum: "lobby" (moderiert von Admins) oder die ID eines Community-Projekts (Besitzer und Admins). */
export async function chatRoom(room: string): Promise<{ projectId: string | null; ownerId: string }> {
  if (room === LOBBY) return { projectId: null, ownerId: "" };
  const project = await requireCommunityProject(room);
  return { projectId: project.id, ownerId: project.ownerId };
}

function serializeMessage(m: CommunityMessage & { author: Author }, v: Viewer, ownerId: string) {
  return {
    id: m.id,
    body: m.body,
    hidden: m.hidden,
    createdAt: m.createdAt.toISOString(),
    author: authorView(m.author),
    byOwner: Boolean(ownerId) && m.authorId === ownerId,
    mine: m.authorId === v.id,
    canDelete: canDelete(v, m.authorId, ownerId),
  };
}
export type MessageItem = ReturnType<typeof serializeMessage>;

/** Die letzten Nachrichten eines Raums, älteste zuerst. */
export async function loadMessages(projectId: string | null, v: Viewer, ownerId: string) {
  const mod = canModerate(v, ownerId);
  const rows = await db.communityMessage.findMany({
    where: { projectId, ...visibleFor(v, mod) },
    include: { author: authorSelect },
    orderBy: { createdAt: "desc" },
    take: CHAT_PAGE,
  });
  return rows.reverse().map((m) => serializeMessage(m, v, ownerId));
}

export async function messageForChange(messageId: string) {
  const message = await db.communityMessage.findUnique({ where: { id: messageId } });
  if (!message) throw notFound(tk("community", "errors.messageNotFound"));
  return { message, ...(await chatRoom(message.projectId ?? LOBBY)) };
}

/** Benachrichtigen – höchstens 10 je Konto und Stunde. */
export async function notifyCommunity(userId: string, kind: "post" | "reply", vars: { project: string; title: string; author: string }, path: string): Promise<void> {
  if (!hit(`community-notify:${userId}`, 10, 60 * MINUTE).ok) return;
  await notifyUser(userId, "community", (t) => ({
    event: "community",
    title: t(kind === "post" ? "events.community.post" : "events.community.reply", vars),
    message: t("events.community.message", vars),
    url: appLink(path),
  })).catch((err) => console.error("[community]", err));
}
