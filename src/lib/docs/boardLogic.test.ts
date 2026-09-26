import { describe, expect, it } from "vitest";
import { boardBounds, BOARD_MAX, BOARD_MAX_ITEMS, boardId, freeSpot, imageBox, moveItem, newBoardItem, parseBoard, resizeItem, serializeBoard } from "./boardLogic";

describe("Leinwand (#211)", () => {
  it("legt ein neues Element um den Zeigepunkt herum an", () => {
    const zettel = newBoardItem("note", { x: 500, y: 300 }, "a1");
    expect(zettel).toMatchObject({ kind: "note", w: 180, h: 140, color: "yellow", text: "" });
    // Mittig: links und oben um die halbe Größe versetzt
    expect(zettel.x).toBe(410);
    expect(zettel.y).toBe(230);
  });

  it("liest gespeicherte Inhalte tolerant und wirft Unbrauchbares weg", () => {
    const board = parseBoard({
      items: [
        { id: "a", kind: "note", x: 10, y: 20, w: 100, h: 80, text: "Hallo", color: "green" },
        { id: "b", kind: "gibtsnicht", x: 0, y: 0 },
        { kind: "note", x: 0, y: 0 },
        null,
        "quatsch",
        { id: "c", kind: "rect", x: "viel", y: Infinity, w: -50, h: 999999, text: 42, color: "pink" },
      ],
    });
    expect(board.items.map((i) => i.id)).toEqual(["a", "c"]);
    expect(board.items[0]).toEqual({ id: "a", kind: "note", x: 10, y: 20, w: 100, h: 80, text: "Hallo", color: "green" });
    // Unsinnige Werte werden auf Erlaubtes gebracht: Text und Unendlich ergeben den Standard,
    // zu klein und zu groß werden auf die Grenzen gezogen
    expect(board.items[1]).toMatchObject({ x: 0, y: 0, w: 24, h: 4000, text: "", color: "gray" });
  });

  it("nimmt Bilder nur mit brauchbarer Upload-Kennung", () => {
    const board = parseBoard({
      items: [
        { id: "a", kind: "image", x: 0, y: 0, upload: "cmtvgjiz00000hkn8oll4jpir" },
        { id: "b", kind: "image", x: 0, y: 0 },
        { id: "c", kind: "image", x: 0, y: 0, upload: "../../etc/passwd" },
        { id: "d", kind: "image", x: 0, y: 0, upload: "https://fremde.seite/bild.png" },
      ],
    });
    expect(board.items.map((i) => i.id)).toEqual(["a"]);
    expect(board.items[0].upload).toBe("cmtvgjiz00000hkn8oll4jpir");
  });

  it("legt ein Bild mit seiner Kennung an – ohne Kennung bleibt das Feld leer", () => {
    expect(newBoardItem("image", { x: 0, y: 0 }, "x", "cmtvgjiz00000hkn8oll4jpir")).toMatchObject({ w: 260, h: 180, upload: "cmtvgjiz00000hkn8oll4jpir" });
    expect(newBoardItem("image", { x: 0, y: 0 }, "x", "kaputt/pfad").upload).toBeUndefined();
  });

  it("liest auch eine gespeicherte Zeichenkette und verträgt Müll", () => {
    expect(parseBoard('{"items":[{"id":"x","kind":"text","x":1,"y":2}]}').items).toHaveLength(1);
    expect(parseBoard("kein json").items).toEqual([]);
    expect(parseBoard(null).items).toEqual([]);
    expect(parseBoard({ items: "nein" }).items).toEqual([]);
  });

  it("nimmt höchstens die erlaubte Zahl an Elementen", () => {
    const viele = { items: Array.from({ length: BOARD_MAX_ITEMS + 50 }, (_, i) => ({ id: `i${i}`, kind: "note", x: i, y: i })) };
    expect(parseBoard(viele).items).toHaveLength(BOARD_MAX_ITEMS);
  });

  it("behält beim Bild das Seitenverhältnis", () => {
    expect(imageBox(1600, 900)).toEqual({ w: 280, h: 158 });
    expect(imageBox(600, 1200)).toEqual({ w: 140, h: 280 });
    expect(imageBox(40, 40)).toEqual({ w: 280, h: 280 });
    // Unbrauchbare Maße ergeben die Standardgröße
    expect(imageBox(0, 0)).toEqual({ w: 260, h: 180 });
    expect(imageBox(NaN, 100)).toEqual({ w: 260, h: 180 });
  });

  it("weicht freien Platz aus, statt Elemente zu überdecken", () => {
    const a = newBoardItem("note", { x: 300, y: 300 }, "a");
    const b = freeSpot([a], newBoardItem("note", { x: 300, y: 300 }, "b"));
    expect(b.x).toBe(a.x + 24);
    expect(b.y).toBe(a.y + 24);
    const c = freeSpot([a, b], newBoardItem("note", { x: 300, y: 300 }, "c"));
    expect(c.x).toBe(a.x + 48);
    // Freie Stelle bleibt, wo sie ist
    expect(freeSpot([a], newBoardItem("note", { x: 900, y: 900 }, "d")).x).toBe(newBoardItem("note", { x: 900, y: 900 }, "d").x);
  });

  it("verschiebt und vergrößert innerhalb der Grenzen", () => {
    const item = newBoardItem("rect", { x: 100, y: 100 }, "r");
    expect(moveItem(item, 50, -20)).toMatchObject({ x: item.x + 50, y: item.y - 20 });
    // Über den Rand hinaus wird gekappt statt zu verschwinden
    expect(moveItem(item, 999_999, 0).x).toBe(BOARD_MAX);
    expect(resizeItem(item, -999, -999)).toMatchObject({ w: 24, h: 24 });
    expect(resizeItem(item, 100, 60)).toMatchObject({ w: 300, h: 200 });
  });

  it("speichert und liest denselben Inhalt wieder ein", () => {
    const items = [newBoardItem("note", { x: 0, y: 0 }, boardId()), newBoardItem("ellipse", { x: 400, y: 100 }, boardId())];
    expect(parseBoard(serializeBoard(items)).items).toEqual(items);
  });

  it("gibt jedem Element eine eigene Kennung", () => {
    const ids = new Set(Array.from({ length: 50 }, () => boardId()));
    expect(ids.size).toBe(50);
    expect([...ids].every((id) => /^[0-9a-f]{16}$/.test(id))).toBe(true);
  });

  it("nennt die Fläche, in der alles liegt – fürs Einpassen", () => {
    expect(boardBounds([])).toBeNull();
    const items = [newBoardItem("note", { x: 200, y: 200 }, "a"), newBoardItem("rect", { x: 600, y: 400 }, "b")];
    const b = boardBounds(items)!;
    expect(b.x).toBe(Math.min(items[0].x, items[1].x));
    expect(b.w).toBeGreaterThan(300);
  });
});
