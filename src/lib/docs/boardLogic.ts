// Leinwand (#211, Schritt 1): eine freie Fläche mit Zetteln, Textfeldern und
// Formen – verschiebbar, in der Größe änderbar, farbig. Alles ohne Netz und
// Datenbank, damit die Rechnerei prüfbar bleibt.
//
// Gespeichert wird der Inhalt als JSON im Dokument. Er kommt aus dem Browser
// und wird deshalb beim Lesen streng auf erwartete Werte gebracht.

export const BOARD_ITEM_KINDS = ["note", "text", "rect", "ellipse", "line", "image"] as const;
export type BoardItemKind = (typeof BOARD_ITEM_KINDS)[number];

export const BOARD_COLORS = ["yellow", "green", "blue", "violet", "red", "gray"] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

export interface BoardItem {
  id: string;
  kind: BoardItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: BoardColor;
  /** Nur bei Bildern: die Kennung des Uploads. Ausgeliefert wird über /api/uploads/<id> –
   *  bewusst keine freie Adresse, damit von der Leinwand nichts Fremdes nachgeladen wird. */
  upload?: string;
}

export interface Board {
  items: BoardItem[];
}

/** Grenzen der Fläche – großzügig, aber nicht unendlich. */
const BOARD_MIN = -20_000;
export const BOARD_MAX = 20_000;
const BOARD_MIN_SIZE = 24;
const BOARD_MAX_SIZE = 4_000;
export const BOARD_MAX_ITEMS = 500;
const BOARD_MAX_TEXT = 4_000;

const clamp = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};

/** Kennung eines Uploads – dieselbe Form wie in src/lib/uploads.ts, hier ohne Server-Abhängigkeit. */
const UPLOAD_ID = /^[a-z0-9]{8,40}$/;
export const isBoardUpload = (v: unknown): v is string => typeof v === "string" && UPLOAD_ID.test(v);

/** Neues Element in der Mitte des Blicks – Größe passend zur Art. */
export function newBoardItem(kind: BoardItemKind, at: { x: number; y: number }, id: string, upload?: string): BoardItem {
  const size =
    kind === "note" ? { w: 180, h: 140 }
    : kind === "image" ? { w: 260, h: 180 }
    : kind === "text" ? { w: 240, h: 60 }
    : kind === "line" ? { w: 200, h: 2 }
    : { w: 200, h: 140 };
  return {
    id,
    kind,
    x: clamp(at.x - size.w / 2, BOARD_MIN, BOARD_MAX, 0),
    y: clamp(at.y - size.h / 2, BOARD_MIN, BOARD_MAX, 0),
    ...size,
    text: "",
    color: kind === "note" ? "yellow" : "gray",
    ...(kind === "image" && isBoardUpload(upload) ? { upload } : {}),
  };
}

/** Gespeicherten Inhalt einlesen – Unbekanntes fällt weg, alles wird begrenzt. */
export function parseBoard(raw: unknown): Board {
  const src = typeof raw === "string" ? safeJson(raw) : raw;
  const list = Array.isArray((src as { items?: unknown })?.items) ? ((src as { items: unknown[] }).items as unknown[]) : [];
  const items: BoardItem[] = [];
  for (const entry of list.slice(0, BOARD_MAX_ITEMS)) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const kind = BOARD_ITEM_KINDS.includes(o.kind as BoardItemKind) ? (o.kind as BoardItemKind) : null;
    const id = typeof o.id === "string" && o.id.length > 0 && o.id.length <= 40 ? o.id : null;
    if (!kind || !id) continue;
    // Ein Bild ohne brauchbare Kennung zeigt nichts – es fällt weg statt als Loch stehen zu bleiben.
    if (kind === "image" && !isBoardUpload(o.upload)) continue;
    items.push({
      ...(kind === "image" ? { upload: o.upload as string } : {}),
      id,
      kind,
      x: clamp(o.x, BOARD_MIN, BOARD_MAX, 0),
      y: clamp(o.y, BOARD_MIN, BOARD_MAX, 0),
      w: clamp(o.w, BOARD_MIN_SIZE, BOARD_MAX_SIZE, 180),
      h: clamp(o.h, kind === "line" ? 1 : BOARD_MIN_SIZE, BOARD_MAX_SIZE, 140),
      text: typeof o.text === "string" ? o.text.slice(0, BOARD_MAX_TEXT) : "",
      color: BOARD_COLORS.includes(o.color as BoardColor) ? (o.color as BoardColor) : "gray",
    });
  }
  return { items };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Element verschieben – bleibt innerhalb der Fläche. */
export function moveItem(item: BoardItem, dx: number, dy: number): BoardItem {
  return { ...item, x: clamp(item.x + dx, BOARD_MIN, BOARD_MAX, item.x), y: clamp(item.y + dy, BOARD_MIN, BOARD_MAX, item.y) };
}

/** Größe ändern – nie kleiner als die Mindestgröße, nie größer als erlaubt. */
export function resizeItem(item: BoardItem, dw: number, dh: number): BoardItem {
  const min = item.kind === "line" ? 1 : BOARD_MIN_SIZE;
  return { ...item, w: clamp(item.w + dw, BOARD_MIN_SIZE, BOARD_MAX_SIZE, item.w), h: clamp(item.h + dh, min, BOARD_MAX_SIZE, item.h) };
}

/** Fläche, in der alle Elemente liegen – fürs Einpassen der Ansicht. */
export function boardBounds(items: BoardItem[]): { x: number; y: number; w: number; h: number } | null {
  if (!items.length) return null;
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

/**
 * Kennung für ein neues Element. Bewusst über `crypto.getRandomValues` –
 * `randomUUID` fehlt im Heimnetz über http (kein „Secure Context“).
 */
export function boardId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Inhalt zum Speichern – dieselbe Form, die `parseBoard` wieder einliest. */
export function serializeBoard(items: BoardItem[]): string {
  return JSON.stringify({ items: items.slice(0, BOARD_MAX_ITEMS) });
}

/**
 * Freier Platz für ein neues Element: liegt an der Stelle schon eines,
 * rutscht das neue schrittweise nach unten rechts – sonst verdeckten sich
 * zwei Zettel in der Mitte der Ansicht vollständig.
 */
export function freeSpot(items: BoardItem[], item: BoardItem): BoardItem {
  const belegt = (x: number, y: number) => items.some((i) => Math.abs(i.x - x) < 12 && Math.abs(i.y - y) < 12);
  let { x, y } = item;
  for (let n = 0; n < BOARD_MAX_ITEMS && belegt(x, y); n++) {
    x = clamp(x + 24, BOARD_MIN, BOARD_MAX, x);
    y = clamp(y + 24, BOARD_MIN, BOARD_MAX, y);
  }
  return { ...item, x, y };
}

/**
 * Größe für ein neues Bild: längste Kante 280, Seitenverhältnis bleibt.
 * Ohne brauchbare Maße bleibt es bei der Standardgröße.
 */
export function imageBox(width: number, height: number): { w: number; h: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return { w: 260, h: 180 };
  const faktor = 280 / Math.max(width, height);
  return {
    w: clamp(width * faktor, BOARD_MIN_SIZE, BOARD_MAX_SIZE, 260),
    h: clamp(height * faktor, BOARD_MIN_SIZE, BOARD_MAX_SIZE, 180),
  };
}
