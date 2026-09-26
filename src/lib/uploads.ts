import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { db } from "./db";

// Hochgeladene Bilder (eigene Hintergründe). Das Format wird an den ersten
// Bytes erkannt, nicht an Dateiname oder Content-Type des Browsers. SVG ist
// bewusst ausgeschlossen – es kann Skripte enthalten.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOADS_PER_USER = 24;
/** Bilder auf Leinwänden zählen getrennt – eine Leinwand lebt von vielen kleinen Bildern. */
export const MAX_BOARD_UPLOADS_PER_USER = 200;

export interface ImageKind {
  mime: string;
  ext: string;
}

function ascii(buf: Uint8Array, start: number, len: number): string {
  return String.fromCharCode(...buf.subarray(start, start + len));
}

export function sniffImage(buf: Uint8Array): ImageKind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && ascii(buf, 1, 3) === "PNG") return { mime: "image/png", ext: "png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (ascii(buf, 0, 4) === "GIF8") return { mime: "image/gif", ext: "gif" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(buf, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(buf, 8, 4))) return { mime: "image/avif", ext: "avif" };
  return null;
}

const ID_RE = /^[a-z0-9]{8,40}$/;

export function isUploadId(id: string): boolean {
  return ID_RE.test(id);
}

function filePath(id: string, ext: string): string {
  if (!isUploadId(id) || !/^[a-z]{3,4}$/.test(ext)) throw new Error("Ungültiger Upload");
  return path.join(config.uploadDir, `${id}.${ext}`);
}

/** usage: "background" (Design-Editor), "cover" (Vorschaubild der Live-Seite) oder "board" (Leinwand) */
export async function saveUpload(userId: string, buf: Uint8Array, kind: ImageKind, usage: "background" | "cover" | "board" = "background") {
  await mkdir(config.uploadDir, { recursive: true });
  const upload = await db.upload.create({
    data: { userId, kind: usage, mime: kind.mime, ext: kind.ext, size: buf.length },
  });
  try {
    await writeFile(filePath(upload.id, upload.ext), buf);
  } catch (err) {
    await db.upload.delete({ where: { id: upload.id } }).catch(() => {});
    throw err;
  }
  return upload;
}

export async function readUpload(id: string, ext: string): Promise<Buffer> {
  return readFile(filePath(id, ext));
}

export async function removeUploadFile(id: string, ext: string) {
  await unlink(filePath(id, ext)).catch(() => {});
}
