import { db } from "@/lib/db";
import { json, notFound, readBody, route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guard";
import { docCreateSchema } from "@/lib/validation";
import { findOwnDoc, loadTree, nextDocPosition, serializeDoc, serializeTreeItem } from "@/lib/docs";
import { tk } from "@/lib/i18n/messages";

export const GET = route(async () => {
  const user = await requireApiUser();
  return json({ tree: await loadTree(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireApiUser();
  const input = await readBody(req, docCreateSchema);
  if (input.parentId && !(await findOwnDoc(user.id, input.parentId))) throw notFound(tk("docs", "errors.parentNotFound"));
  const doc = await db.doc.create({
    data: {
      ownerId: user.id,
      parentId: input.parentId,
      kind: input.kind,
      title: input.title,
      position: await nextDocPosition(user.id, input.parentId),
    },
  });
  return json({ doc: serializeDoc(doc), item: serializeTreeItem(doc) }, { status: 201 });
});
