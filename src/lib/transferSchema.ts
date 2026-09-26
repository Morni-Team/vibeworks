import { z } from "zod";
import { tk } from "@/lib/i18n/messages";
import { projectStatusSchema, recurrenceSchema, taskStatusSchema } from "@/lib/validation";

// Format des JSON-Exports – ohne Datenbank, damit es sich testen lässt.
// Der Import ist bewusst nachsichtig: unbekannte oder kaputte Einzelwerte
// fallen auf Vorgaben zurück, statt die ganze Datei abzulehnen.

export const EXPORT_FORMAT = "vibeworks-export";
export const EXPORT_VERSION = 1;

const isoDate = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)));

const taskIn = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000).nullish(),
  status: taskStatusSchema.catch("TODO"),
  labels: z.array(z.string().max(40)).max(30).catch([]),
  recurrence: recurrenceSchema.nullish().catch(null),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().catch(null),
  doneAt: isoDate.nullish().catch(null),
});

const noteIn = z.object({
  title: z.string().max(200).nullish(),
  content: z.string().min(1).max(50_000),
  pinned: z.boolean().catch(false),
  createdAt: isoDate.nullish().catch(null),
});

const projectIn = z.object({
  name: z.string().trim().min(1).max(120),
  summary: z.string().max(240).nullish(),
  description: z.string().max(20_000).nullish(),
  status: projectStatusSchema.catch("IDEA"),
  priority: z.number().int().min(1).max(4).catch(2),
  progress: z.number().int().min(0).max(100).catch(0),
  accent: z.string().max(20).catch("violet"),
  tags: z.array(z.string().max(64)).max(50).catch([]),
  favorite: z.boolean().catch(false),
  progressFromTasks: z.boolean().catch(false),
  repoUrl: z.string().max(500).regex(/^(https?:\/\/|git@)\S+$/).nullish().catch(null),
  tasks: z.array(taskIn).max(2000).default([]),
  notes: z.array(noteIn).max(1000).default([]),
});

const docIn = z.object({
  ref: z.string().min(1).max(64),
  parentRef: z.string().max(64).nullish(),
  kind: z.enum(["PAGE", "WEB", "HTML", "BOARD"]).catch("PAGE"),
  title: z.string().trim().min(1).max(200),
  icon: z.string().max(16).nullish(),
  content: z.string().max(1_000_000).default(""),
  sourceUrl: z.string().max(2000).nullish(),
  archive: z.string().max(5_000_000).nullish(),
  pinned: z.boolean().catch(false),
  position: z.number().int().min(0).max(100_000).catch(0),
});

export const importSchema = z.object({
  format: z.literal(EXPORT_FORMAT, { error: tk("data", "errors.format") }),
  version: z.number().int().min(1).max(EXPORT_VERSION, tk("data", "errors.version")),
  projects: z.array(projectIn).max(500).default([]),
  docs: z.array(docIn).max(5000).default([]),
});
export type ImportData = z.output<typeof importSchema>;

/**
 * Seiten so ordnen, dass Eltern vor ihren Kindern kommen. Verweise ins Leere
 * werden zu Wurzeln; Kreise werden aufgebrochen statt endlos zu laufen.
 */
export function orderDocs<T extends { ref: string; parentRef?: string | null }>(docs: T[]): Array<T & { parentRef: string | null }> {
  const byRef = new Map(docs.map((d) => [d.ref, d]));
  const depth = new Map<string, number>();
  const depthOf = (d: T, seen: Set<string>): number => {
    const known = depth.get(d.ref);
    if (known !== undefined) return known;
    const parent = d.parentRef ? byRef.get(d.parentRef) : undefined;
    let value = 0;
    if (parent && !seen.has(d.ref)) {
      seen.add(d.ref);
      value = depthOf(parent, seen) + 1;
    }
    depth.set(d.ref, value);
    return value;
  };
  return docs
    .map((d) => ({ ...d, parentRef: d.parentRef && byRef.has(d.parentRef) && d.parentRef !== d.ref ? d.parentRef : null }))
    .sort((a, b) => depthOf(a, new Set()) - depthOf(b, new Set()));
}
