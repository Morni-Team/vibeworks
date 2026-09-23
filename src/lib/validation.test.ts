import { describe, expect, it } from "vitest";
import { apiTokenCreateSchema, noteUpdateSchema, projectCreateSchema, projectUpdateSchema, safeNext, usernameSchema } from "./validation";

describe("Teil-Updates lassen Fehlendes unangetastet", () => {
  it("Notiz anpinnen löscht den Titel nicht", () => {
    const out = noteUpdateSchema.parse({ pinned: true });
    expect(out.title).toBeUndefined();
    expect(out.content).toBeUndefined();
  });

  it("leerer Titel heißt bewusst: Titel entfernen", () => {
    expect(noteUpdateSchema.parse({ title: "  " }).title).toBeNull();
  });

  it("Projekt-Update ohne Beschreibung behält sie", () => {
    const out = projectUpdateSchema.parse({ favorite: true });
    expect(out).not.toHaveProperty("description", null);
    expect(out.description).toBeUndefined();
    expect(out.summary).toBeUndefined();
  });
});

describe("Projekte", () => {
  it("normalisiert Tags aus Text", () => {
    expect(projectCreateSchema.parse({ name: "X", tags: "Next JS, ki ,ki" }).tags).toEqual(["next-js", "ki"]);
  });

  it("lehnt javascript:-Adressen als Repository ab", () => {
    expect(projectCreateSchema.safeParse({ name: "X", repoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(projectCreateSchema.parse({ name: "X", repoUrl: "git@github.com:a/b.git" }).repoUrl).toBe("git@github.com:a/b.git");
  });
});

describe("Sonstiges", () => {
  it("Benutzernamen werden kleingeschrieben", () => {
    expect(usernameSchema.parse(" Morni ")).toBe("morni");
  });

  it("Weiterleitungen nur innerhalb der App", () => {
    expect(safeNext("/projects/1")).toBe("/projects/1");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
  });
});

describe("API-Schlüssel anlegen (#192)", () => {
  it("nimmt den gewünschten Umfang an, statt ihn stillschweigend zu verwerfen", () => {
    expect(apiTokenCreateSchema.parse({ name: "Nur lesen", scope: "read" }).scope).toBe("read");
    expect(apiTokenCreateSchema.parse({ name: "Aufgaben", scope: "tasks" }).scope).toBe("tasks");
    // Ohne Angabe bleibt es wie bisher – die Route setzt dann den Standard
    expect(apiTokenCreateSchema.parse({ name: "Ohne" }).scope).toBeUndefined();
    expect(() => apiTokenCreateSchema.parse({ name: "Quatsch", scope: "alles" })).toThrow();
  });
});
