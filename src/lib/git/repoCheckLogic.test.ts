import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { blobUrl, checkGotWorse, checkIsUrgent, parseCheckReport, reportIsStale } from "./repoCheckLogic";
import { REPO_CHECK_ARTIFACT, REPO_CHECK_WORKFLOW } from "./repoCheckWorkflow";

describe("Workflow", () => {
  it("Vorlage und Datei im Repository sind gleich", () => {
    expect(REPO_CHECK_WORKFLOW).toBe(readFileSync(".github/workflows/vibeworks-check.yml", "utf8"));
  });
  it("nur Leserechte, Artefakt mit festem Namen, kein Geheimnis", () => {
    expect(REPO_CHECK_WORKFLOW).toContain("permissions:\n  contents: read");
    expect(REPO_CHECK_WORKFLOW).toContain(`name: ${REPO_CHECK_ARTIFACT}`);
    expect(REPO_CHECK_WORKFLOW).not.toContain("secrets.");
  });
});

describe("parseCheckReport", () => {
  it("liest einen echten Bericht", () => {
    const r = parseCheckReport({
      commit: "abc1234def",
      finishedAt: "2026-09-15T10:00:00Z",
      tools: { gitleaks: true, osv: true, semgrep: false, todos: true },
      secrets: [{ file: "src/a.ts", line: 3, rule: "generic-api-key", description: "Generic API Key", commit: "abc" }],
      vulnerabilities: [{ package: "lodash", version: "4.17.20", ecosystem: "npm", id: "GHSA-1", summary: "Prototype pollution", severity: "7.2", source: "package-lock.json" }],
      findings: [],
      todos: [{ file: "README.md", line: 12, text: "TODO: Doku" }],
    });
    expect(r.counts).toEqual({ secrets: 1, vulnerabilities: 1, findings: 0, todos: 1 });
    expect(r.tools).toEqual({ gitleaks: true, osv: true, semgrep: false, todos: true, extra: [] });
    expect(r.secrets[0]).toMatchObject({ file: "src/a.ts", line: 3, rule: "generic-api-key" });
    expect(checkIsUrgent(r)).toBe(true);
  });
  it("fremde Daten werden entschärft und begrenzt", () => {
    const r = parseCheckReport({ commit: "; rm -rf /", finishedAt: "gestern", secrets: [{ file: 5, line: -1 }, null, "x"], todos: Array.from({ length: 999 }, () => ({ file: "a", line: 1, text: "TODO" })) });
    expect(r.commit).toBe("");
    expect(r.finishedAt).toBeNull();
    expect(r.secrets).toEqual([{ file: "5", line: null, rule: "", description: "", commit: "" }]);
    expect(r.counts.todos).toBe(300);
    expect(checkIsUrgent(parseCheckReport(null))).toBe(false);
  });
});

describe("checkGotWorse", () => {
  const counts = (secrets: number, vulnerabilities: number) => ({ counts: { secrets, vulnerabilities, findings: 9, todos: 9 } });
  it("meldet nur neue Geheimnisse oder Lücken", () => {
    expect(checkGotWorse(null, counts(0, 0))).toBe(false);
    expect(checkGotWorse(null, counts(1, 0))).toBe(true);
    expect(checkGotWorse(counts(1, 2), counts(1, 2))).toBe(false);
    expect(checkGotWorse(counts(1, 2), counts(0, 3))).toBe(true);
    expect(checkGotWorse(counts(2, 2), counts(1, 1))).toBe(false);
  });
});

describe("blobUrl", () => {
  it("baut Links auf GitHub, keine Pfad-Tricks", () => {
    expect(blobUrl("https://github.com/a/b", "abc123", "src/my file.ts", 7)).toBe("https://github.com/a/b/blob/abc123/src/my%20file.ts#L7");
    expect(blobUrl("https://github.com/a/b/", "", "x.ts", null)).toBe("https://github.com/a/b/blob/HEAD/x.ts");
    expect(blobUrl("https://github.com/a/b", "abc", "../../etc/passwd", 1)).toBeNull();
  });
});

describe("Sprachwerkzeuge (#92)", () => {
  it("zählen als geprüfte Befunde und werden aufgelistet", () => {
    const r = parseCheckReport({ tools: { bandit: true, hadolint: true, evil: true }, findings: Array.from({ length: 450 }, () => ({ file: "a.py", rule: "bandit:B101" })) });
    expect(r.tools.semgrep).toBe(true);
    expect(r.tools.extra).toEqual(["bandit", "hadolint"]);
    expect(r.findings).toHaveLength(400);
  });
});

describe("Verlässlichkeit des Berichts (#148, #149)", () => {
  it("meldet abgebrochene Werkzeuge und verwirft Unbrauchbares", () => {
    const r = parseCheckReport({ toolErrors: [{ tool: "osv", message: "OSV-Scanner: Schritt abgebrochen (failure)" }, { tool: "", message: "ohne Werkzeug" }, { message: "gar nichts" }] });
    expect(r.toolErrors).toEqual([{ tool: "osv", message: "OSV-Scanner: Schritt abgebrochen (failure)" }]);
    expect(parseCheckReport({}).toolErrors).toEqual([]);
  });

  it("erkennt einen Bericht zu einem älteren Commit", () => {
    expect(reportIsStale("aaaaaaa1111", "bbbbbbb2222")).toBe(true);
    expect(reportIsStale("aaaaaaa1111", "aaaaaaa1111")).toBe(false);
    // GitHub kürzt unterschiedlich – auf der gemeinsamen Länge vergleichen
    expect(reportIsStale("aaaaaaa1111", "AAAAAAA")).toBe(false);
    // Fehlt eine Seite, gilt der Bericht als aktuell – lieber nichts behaupten
    expect(reportIsStale("", "bbbbbbb2222")).toBe(false);
    expect(reportIsStale("aaaaaaa1111", null)).toBe(false);
  });
});
