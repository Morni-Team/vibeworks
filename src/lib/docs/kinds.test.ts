import { describe, expect, it } from "vitest";
import { docIcon } from "./kinds";

describe("Symbol einer Seite (#211)", () => {
  it("nimmt das eigene Symbol, wenn eines gesetzt ist", () => {
    expect(docIcon({ icon: "🚀", kind: "BOARD" })).toBe("🚀");
  });

  it("wählt sonst eines je Art – Unbekanntes bekommt das Blatt", () => {
    expect(docIcon({ icon: null, kind: "BOARD" })).toBe("🎨");
    expect(docIcon({ icon: "", kind: "WEB" })).toBe("🌐");
    expect(docIcon({ icon: null, kind: "PAGE" })).toBe("📄");
    expect(docIcon({ icon: null, kind: "EGAL" })).toBe("📄");
  });
});
