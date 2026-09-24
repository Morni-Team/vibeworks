// Projekteigene Ausnahmen für den Repo-Check (#197): Nicht jeder Fund ist in
// jedem Projekt ein Problem. Eine lokale Desktop-App hat keine fremden
// Angreiferpfade, und Dateien, die per <script src> im HTML hängen, sieht der
// Analysator nicht. Damit solche Meldungen nicht jede Woche wiederkommen, legt
// das geprüfte Repository eine Datei an:
//
//   .vibeworks-check.json
//   {
//     "ignoreRules": ["fallow:unused-file", "javascript.lang.security.audit.path-traversal"],
//     "ignorePaths": ["src/renderer/**", "scripts/**"],
//     "reason": "Renderer hängt im HTML, Skripte werden von Hand gestartet"
//   }
//
// Unterdrückt wird nur, was hier steht – und VibeWorks zeigt immer, wie viele
// Funde weggefiltert wurden. Verstecken soll sich nichts lassen, ohne dass man
// es sieht. Ohne Netz und Datenbank.

import type { CheckReport } from "./repoCheckLogic";

export interface CheckIgnore {
  /** Regelnamen oder Anfänge davon – „fallow:unused-file“, „javascript.lang.security“ */
  ignoreRules: string[];
  /** Pfadmuster mit * (ein Stück) und ** (beliebig tief) */
  ignorePaths: string[];
  /** Kurze Begründung, die in der Oberfläche steht */
  reason: string | null;
}

const EMPTY_CHECK_IGNORE: CheckIgnore = { ignoreRules: [], ignorePaths: [], reason: null };

const MAX_ENTRIES = 100;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, MAX_ENTRIES).map((x) => x.slice(0, max)) : []);

/** Die Datei kommt aus einem fremden Repository – alles begrenzen und prüfen. */
export function parseCheckIgnore(raw: string | null | undefined): CheckIgnore {
  if (!raw) return EMPTY_CHECK_IGNORE;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_CHECK_IGNORE;
  }
  if (!data || typeof data !== "object") return EMPTY_CHECK_IGNORE;
  const o = data as Record<string, unknown>;
  return {
    ignoreRules: list(o.ignoreRules, 200),
    ignorePaths: list(o.ignorePaths, 300),
    reason: str(o.reason, 300) || null,
  };
}

/**
 * Ein Namensstück vergleichen, nur mit „*“. Bewusst ohne RegExp: Das Muster
 * kommt aus einem fremden Repository, und ein aus Fremdtext gebauter Ausdruck
 * kann sich beim Prüfen verheddern und den Server ausbremsen (#199). Dieses
 * Verfahren läuft in einem Durchgang mit Rücksprung – nie exponentiell.
 */
function partMatches(pattern: string, part: string): boolean {
  let p = 0;
  let i = 0;
  let star = -1;
  let mark = 0;
  while (i < part.length) {
    if (p < pattern.length && (pattern[p] === part[i] || pattern[p] === "?")) {
      p++;
      i++;
    } else if (p < pattern.length && pattern[p] === "*") {
      star = p++;
      mark = i;
    } else if (star >= 0) {
      p = star + 1;
      i = ++mark;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === "*") p++;
  return p === pattern.length;
}

/** Pfadmuster: * bleibt im Ordner, ** geht beliebig tief. Ohne RegExp (#199). */
export function pathMatches(pattern: string, file: string): boolean {
  const pats = pattern.replace(/^\.?\//, "").split("/");
  const parts = file.replace(/^\.?\//, "").split("/");
  let p = 0;
  let i = 0;
  let star = -1;
  let mark = 0;
  while (i < parts.length) {
    if (p < pats.length && pats[p] === "**") {
      star = p++;
      mark = i;
    } else if (p < pats.length && partMatches(pats[p], parts[i])) {
      p++;
      i++;
    } else if (star >= 0) {
      p = star + 1;
      i = ++mark;
    } else {
      return false;
    }
  }
  while (p < pats.length && pats[p] === "**") p++;
  return p === pats.length;
}

const ruleHit = (rules: string[], rule: string) => rules.some((r) => rule === r || rule.startsWith(r));
const pathHit = (paths: string[], file: string) => Boolean(file) && paths.some((p) => pathMatches(p, file));

/**
 * Bericht um die ausgenommenen Funde kürzen. Geheimnisse bleiben immer drin –
 * ein gefundenes Passwort darf sich kein Projekt wegkonfigurieren.
 */
export function applyCheckIgnore(report: CheckReport, ignore: CheckIgnore): CheckReport {
  if (!ignore.ignoreRules.length && !ignore.ignorePaths.length) return report;
  const drop = (x: { rule?: string; file?: string }) => ruleHit(ignore.ignoreRules, x.rule ?? "") || pathHit(ignore.ignorePaths, x.file ?? "");
  const findings = report.findings.filter((f) => !drop(f));
  const todos = report.todos.filter((t) => !pathHit(ignore.ignorePaths, t.file));
  const vulnerabilities = report.vulnerabilities.filter((v) => !ruleHit(ignore.ignoreRules, v.id) && !pathHit(ignore.ignorePaths, v.source));
  const suppressed = report.findings.length - findings.length + (report.todos.length - todos.length) + (report.vulnerabilities.length - vulnerabilities.length);
  return {
    ...report,
    findings,
    todos,
    vulnerabilities,
    suppressed: (report.suppressed ?? 0) + suppressed,
    counts: { secrets: report.secrets.length, vulnerabilities: vulnerabilities.length, findings: findings.length, todos: todos.length },
  };
}
