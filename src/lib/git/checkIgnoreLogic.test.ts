import { describe, expect, it } from "vitest";
import { applyCheckIgnore, applyDismissed, dismissKey, dismissTarget, parseCheckIgnore, pathMatches } from "./checkIgnoreLogic";
import { parseCheckReport } from "./repoCheckLogic";

const report = (extra: Record<string, unknown> = {}) =>
  parseCheckReport({
    commit: "abc1234",
    secrets: [{ file: "src/a.ts", line: 3, rule: "generic-api-key", description: "Passwort" }],
    vulnerabilities: [{ package: "left-pad", id: "GHSA-1", source: "julia-android/package.json" }],
    findings: [
      { file: "src/renderer/chat.js", line: 1, rule: "fallow:unused-file", message: "nicht importiert" },
      { file: "src/main/pfade.js", line: 9, rule: "javascript.lang.security.audit.path-traversal.x", message: "path.join" },
      { file: "src/echt.ts", line: 2, rule: "javascript.lang.security.audit.sqli", message: "echter Fund" },
    ],
    todos: [{ file: "scripts/whisper-holen.js", line: 4, text: "TODO später" }],
    ...extra,
  });

describe("Projekt-Ausnahmen für den Repo-Check (#197)", () => {
  it("liest die Datei tolerant und begrenzt sie", () => {
    const c = parseCheckIgnore('{"ignoreRules":["fallow:unused-file"],"ignorePaths":["src/renderer/**"],"reason":"Renderer hängt im HTML"}');
    expect(c).toEqual({ ignoreRules: ["fallow:unused-file"], ignorePaths: ["src/renderer/**"], reason: "Renderer hängt im HTML" });
    // Unbrauchbares ergibt einfach keine Ausnahme
    expect(parseCheckIgnore("kein json")).toEqual({ ignoreRules: [], ignorePaths: [], reason: null });
    expect(parseCheckIgnore(null)).toEqual({ ignoreRules: [], ignorePaths: [], reason: null });
    expect(parseCheckIgnore('{"ignoreRules":[1,2,{}]}').ignoreRules).toEqual([]);
  });

  it("versteht * und ** in Pfaden", () => {
    expect(pathMatches("src/renderer/**", "src/renderer/tief/chat.js")).toBe(true);
    expect(pathMatches("src/renderer/**", "src/renderer/chat.js")).toBe(true);
    expect(pathMatches("src/renderer/*", "src/renderer/tief/chat.js")).toBe(false);
    expect(pathMatches("scripts/**", "scripts/whisper-holen.js")).toBe(true);
    expect(pathMatches("*.md", "LIESMICH.md")).toBe(true);
    expect(pathMatches("src/renderer/**", "src/main/chat.js")).toBe(false);
    // Führendes ./ stört nicht
    expect(pathMatches("scripts/**", "./scripts/x.js")).toBe(true);
  });

  it("verheddert sich nicht an einem bösartigen Muster (#199)", () => {
    // Früher baute pathMatches daraus einen regulären Ausdruck – ein solches
    // Muster hätte den Server minutenlang beschäftigt. Jetzt ist es sofort durch.
    const gemein = "*a*a*a*a*a*a*a*a*a*a*a*a*b";
    const lang = `src/${"a".repeat(600)}.ts`;
    const start = Date.now();
    expect(pathMatches(gemein, lang)).toBe(false);
    expect(pathMatches("**/*a*a*a*a*a*a*b", lang)).toBe(false);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("filtert nach Regel und Pfad und zählt mit", () => {
    const gefiltert = applyCheckIgnore(report(), {
      ignoreRules: ["fallow:unused-file", "javascript.lang.security.audit.path-traversal"],
      ignorePaths: ["scripts/**"],
      reason: null,
    });
    expect(gefiltert.findings.map((f) => f.file)).toEqual(["src/echt.ts"]);
    expect(gefiltert.todos).toEqual([]);
    expect(gefiltert.suppressed).toBe(3);
    expect(gefiltert.counts).toEqual({ secrets: 1, vulnerabilities: 1, findings: 1, todos: 0 });
  });

  it("lässt Geheimnisse immer stehen – die darf sich niemand wegkonfigurieren", () => {
    const gefiltert = applyCheckIgnore(report(), { ignoreRules: ["generic-api-key"], ignorePaths: ["src/**"], reason: null });
    expect(gefiltert.secrets).toHaveLength(1);
    expect(gefiltert.counts.secrets).toBe(1);
  });

  it("nimmt Sicherheitslücken nur mit ausdrücklicher Kennung oder Pfad heraus", () => {
    expect(applyCheckIgnore(report(), { ignoreRules: ["GHSA-1"], ignorePaths: [], reason: null }).vulnerabilities).toHaveLength(0);
    expect(applyCheckIgnore(report(), { ignoreRules: [], ignorePaths: ["julia-android/**"], reason: null }).vulnerabilities).toHaveLength(0);
    expect(applyCheckIgnore(report(), { ignoreRules: ["egal"], ignorePaths: [], reason: null }).vulnerabilities).toHaveLength(1);
  });

  it("ohne Ausnahmen bleibt der Bericht, wie er ist", () => {
    const r = report();
    expect(applyCheckIgnore(r, { ignoreRules: [], ignorePaths: [], reason: null })).toBe(r);
  });

  it("hakt einen Fund als Fehlalarm ab und holt ihn zurück (#203)", () => {
    const r = report();
    const ziel = dismissTarget(r, "findings", 0);
    expect(ziel).toEqual({ rule: "fallow:unused-file", file: "src/renderer/chat.js" });
    const weg = applyDismissed(r, [dismissKey(ziel!.rule, ziel!.file)]);
    expect(weg.findings.map((f) => f.file)).toEqual(["src/main/pfade.js", "src/echt.ts"]);
    expect(weg.suppressed).toBe(1);
    expect(weg.counts.findings).toBe(2);
    // Ohne Haken bleibt alles, wie es war – dieselbe Instanz
    expect(applyDismissed(r, [])).toBe(r);
    expect(applyDismissed(r, ["gibtsnicht|nirgends"])).toBe(r);
  });

  it("bietet für Geheimnisse gar kein Ziel an – die bleiben immer sichtbar", () => {
    expect(dismissTarget(report(), "secrets", 0)).toBeNull();
    expect(dismissTarget(report(), "findings", 99)).toBeNull();
    expect(dismissTarget(report(), "vulnerabilities", 0)).toEqual({ rule: "GHSA-1", file: "julia-android/package.json" });
    expect(dismissTarget(report(), "todos", 0)).toEqual({ rule: "todo", file: "scripts/whisper-holen.js" });
  });
});
