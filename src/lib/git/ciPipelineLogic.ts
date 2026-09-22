import { z } from "zod";

// CI-Designer (#107): eine Pipeline aus Blöcken, die VibeWorks als GitHub-
// Actions-Workflow ins Repository schreibt – Auslöser, Reihenfolge und
// Bedingungen wählbar, eigene Skripte für Erfahrene. Ohne Netz und Datenbank.

export const CI_FILE = "vibeworks-ci.yml";
export const CI_PATH = `.github/workflows/${CI_FILE}`;
/** Erste Zeile – nur Dateien mit dieser Zeile überschreibt VibeWorks. */
export const CI_MARKER = "# Von VibeWorks (CI-Designer) angelegt – Änderungen bitte in VibeWorks vornehmen.";

export const STEP_KINDS = ["node-install", "npm-script", "fallow", "python-install", "pytest", "go-test", "cargo-test", "custom"] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export const STEP_WHEN = ["success", "always", "failure", "main"] as const;
type StepWhen = (typeof STEP_WHEN)[number];

export const MAX_STEPS = 25;
const SAFE_NAME = /^[\p{L}\p{N} ()._:/+-]{1,60}$/u;
const SAFE_BRANCH = /^(?!.*\.\.)[\w][\w./*-]{0,100}$/;
const SAFE_SCRIPT = /^[\w:.-]{1,60}$/;
const CRON = /^([\d*/,-]+\s+){4}[\d*/,-]+$/;
/** Keine GitHub-Ausdrücke in eigenen Skripten – sonst ließen sich Repository-Geheimnisse auslesen. */
const noExpressions = (v: string) => !v.includes("${{");

const ciStepSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{4,16}$/),
  kind: z.enum(STEP_KINDS),
  name: z.string().trim().regex(SAFE_NAME),
  when: z.enum(STEP_WHEN).default("success"),
  /** npm-script: Name des Skripts */
  script: z.string().regex(SAFE_SCRIPT).optional(),
  /** custom: Befehle (Bash) */
  run: z.string().max(4000).refine(noExpressions, "${{ … }} is not allowed in custom scripts – use plain shell variables").optional(),
  /** Versionen der Umgebung */
  version: z.string().regex(/^[\w.-]{1,20}$/).optional(),
  /** Fehler nicht als rot werten */
  continueOnError: z.boolean().default(false),
});
export type CiStep = z.infer<typeof ciStepSchema>;

export const ciPipelineSchema = z.object({
  triggers: z.object({
    push: z.array(z.string().regex(SAFE_BRANCH)).max(10).default([]),
    pullRequest: z.boolean().default(true),
    schedule: z.string().trim().regex(CRON).nullable().default(null),
    manual: z.boolean().default(true),
  }),
  steps: z.array(ciStepSchema).min(1).max(MAX_STEPS),
  timeoutMinutes: z.number().int().min(1).max(120).default(20),
});
export type CiPipeline = z.infer<typeof ciPipelineSchema>;

// Kennung eines Schritts: muss nur eindeutig sein, ist kein Geheimnis. Bewusst
// getRandomValues statt randomUUID – letzteres gibt es im Browser nur über
// https oder localhost, sonst ließe sich im Heimnetz kein Schritt mehr anlegen.
const newStepId = () => {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const STEP_DEFAULT_NAME: Record<StepKind, string> = {
  "node-install": "Node einrichten",
  "npm-script": "npm-Skript",
  fallow: "Code-Analyse (fallow)",
  "python-install": "Python einrichten",
  pytest: "Tests (pytest)",
  "go-test": "Go testen",
  "cargo-test": "Rust testen",
  custom: "Eigener Schritt",
};

export function newStep(kind: StepKind, extra: Partial<CiStep> = {}): CiStep {
  return { id: newStepId(), kind, name: STEP_DEFAULT_NAME[kind], when: "success", continueOnError: false, ...extra };
}

// ── Ablauf-Reihenfolge für die Node-Ansicht ────────────────
// GitHub Actions führt die Blöcke streng hintereinander aus. Die Node-Ansicht
// bildet das mit „jeder Node verbindet zum nächsten“ ab – die Verbindungen
// ergeben sich aus der Reihenfolge, liegen aber als Paare vor, damit die
// Ansicht sie zeichnen kann, ohne die Liste zu lesen.

/** Verbindungen (von → nach) in Ablauf-Reihenfolge; der erste Step ist der Einstieg. */
export function stepFlow(steps: { id: string }[]): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (let i = 1; i < steps.length; i++) out.push({ from: steps[i - 1].id, to: steps[i].id });
  return out;
}

/** Der Main-Node (Einstieg) ist der erste Step; ohne Steps gibt es keinen. */
export function entryStepId(steps: { id: string }[]): string | null {
  return steps[0]?.id ?? null;
}

/** Nächster Step in der Kette (für „danach einfügen“ in der Node-Ansicht). */
export function nextStepId(steps: { id: string }[], id: string): string | null {
  const i = steps.findIndex((s) => s.id === id);
  return i >= 0 ? steps[i + 1]?.id ?? null : null;
}

/** Vorschlag aus den Dateien des Repositorys – damit man nicht bei null anfängt. */
export function suggestPipeline(files: string[], defaultBranch: string | null, scripts: string[] = []): CiPipeline {
  const has = (re: RegExp) => files.some((f) => re.test(f));
  const steps: CiStep[] = [];
  if (has(/^package\.json$/)) {
    steps.push(newStep("node-install", { version: "22" }));
    for (const s of ["typecheck", "lint", "test", "build"]) if (scripts.includes(s)) steps.push(newStep("npm-script", { script: s, name: `npm run ${s}` }));
    if (!scripts.length) steps.push(newStep("npm-script", { script: "test", name: "npm test" }));
    steps.push(newStep("fallow", { continueOnError: true }));
  }
  if (has(/^(requirements[^/]*\.txt|pyproject\.toml)$/)) {
    steps.push(newStep("python-install", { version: "3.12" }));
    steps.push(newStep("pytest"));
  }
  if (has(/^go\.mod$/)) steps.push(newStep("go-test"));
  if (has(/^Cargo\.toml$/)) steps.push(newStep("cargo-test"));
  if (!steps.length) steps.push(newStep("custom", { run: 'echo "Hier eigene Befehle eintragen"' }));
  return { triggers: { push: defaultBranch ? [defaultBranch] : ["main"], pullRequest: true, schedule: null, manual: true }, steps, timeoutMinutes: 20 };
}

// ── YAML ────────────────────────────────────────────────────

/** Sicher als YAML-Zeichenkette (JSON ist gültiges YAML). */
const str = (s: string) => JSON.stringify(s);

const IF: Record<StepWhen, (branch: string) => string | null> = {
  success: () => null,
  always: () => "always()",
  failure: () => "failure()",
  main: (branch) => `github.ref == ${str(`refs/heads/${branch}`).replace(/"/g, "'")}`,
};

function stepLines(s: CiStep, branch: string): string[] {
  const head = [`      - name: ${str(s.name)}`];
  const cond = IF[s.when](branch);
  if (cond) head.push(`        if: \${{ ${cond} }}`);
  if (s.continueOnError) head.push("        continue-on-error: true");
  const run = (cmd: string) => [...head, "        run: |", ...cmd.split("\n").map((l) => `          ${l}`)];
  switch (s.kind) {
    case "node-install":
      return [
        ...head,
        "        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4",
        "        with:",
        `          node-version: ${str(s.version ?? "22")}`,
        `      - name: ${str(`${s.name} (Abhängigkeiten)`)}`,
        ...(cond ? [`        if: \${{ ${cond} }}`] : []),
        "        run: |",
        "          if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile",
        "          elif [ -f yarn.lock ]; then corepack enable && yarn install --immutable",
        "          elif [ -f package-lock.json ]; then npm ci",
        "          else npm install; fi",
      ];
    case "npm-script":
      return run(`npm run ${s.script ?? "test"} --if-present`);
    case "fallow":
      return run("npx -y fallow@3 dead-code");
    case "python-install":
      return [
        ...head,
        "        uses: actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 # v5",
        "        with:",
        `          python-version: ${str(s.version ?? "3.12")}`,
        `      - name: ${str(`${s.name} (Abhängigkeiten)`)}`,
        ...(cond ? [`        if: \${{ ${cond} }}`] : []),
        "        run: |",
        "          python -m pip install --upgrade pip",
        "          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi",
        "          if [ -f pyproject.toml ]; then pip install -e . || true; fi",
        "          pip install pytest",
      ];
    case "pytest":
      return run("python -m pytest");
    case "go-test":
      return [
        `      - name: ${str(`${s.name} (Go)`)}`,
        ...(cond ? [`        if: \${{ ${cond} }}`] : []),
        "        uses: actions/setup-go@40f1582b2485089dde7abd97c1529aa768e1baff # v5",
        "        with:",
        `          go-version: ${str(s.version ?? "stable")}`,
        ...run("go test ./..."),
      ];
    case "cargo-test":
      return run("cargo test --all");
    case "custom":
      return run(s.run?.trim() || "true");
  }
}

/** Der Workflow als YAML – Schritt-Namen sind die Brücke zur Live-Anzeige. */
export function buildCiWorkflow(p: CiPipeline, defaultBranch: string | null): string {
  const branch = defaultBranch && SAFE_BRANCH.test(defaultBranch) ? defaultBranch : "main";
  const on: string[] = [];
  if (p.triggers.push.length) on.push("  push:", `    branches: [${p.triggers.push.map(str).join(", ")}]`);
  if (p.triggers.pullRequest) on.push("  pull_request:");
  if (p.triggers.schedule) on.push("  schedule:", `    - cron: ${str(p.triggers.schedule)}`);
  if (p.triggers.manual || !on.length) on.push("  workflow_dispatch:");
  return [
    CI_MARKER,
    "name: VibeWorks CI",
    "",
    "on:",
    ...on,
    "",
    "permissions:",
    "  contents: read",
    "",
    "concurrency:",
    "  group: vibeworks-ci-${{ github.ref }}",
    "  cancel-in-progress: true",
    "",
    "jobs:",
    "  ci:",
    "    runs-on: ubuntu-latest",
    `    timeout-minutes: ${p.timeoutMinutes}`,
    "    steps:",
    "      - name: Checkout",
    "        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
    "        with:",
    "          persist-credentials: false",
    ...p.steps.flatMap((s) => stepLines(s, branch)),
    "",
  ].join("\n");
}

// ── Live-Anzeige ────────────────────────────────────────────

export type NodeState = "idle" | "queued" | "running" | "success" | "failure" | "skipped";

export interface GhStep {
  name: string;
  status: string;
  conclusion: string | null;
}

const stateOf = (s: GhStep): NodeState => {
  if (s.status === "queued" || s.status === "pending" || s.status === "waiting") return "queued";
  if (s.status === "in_progress") return "running";
  if (s.conclusion === "success") return "success";
  if (s.conclusion === "skipped") return "skipped";
  if (s.conclusion === "failure" || s.conclusion === "cancelled" || s.conclusion === "timed_out") return "failure";
  return "idle";
};

const RANK: Record<NodeState, number> = { idle: 0, skipped: 1, success: 2, queued: 3, running: 4, failure: 5 };

/** Zustand je Block aus den Schritten des GitHub-Jobs (ein Block kann zwei Schritte haben). */
export function nodeStates(p: CiPipeline, steps: GhStep[], runStatus: string | null): Record<string, NodeState> {
  const out: Record<string, NodeState> = {};
  for (const s of p.steps) {
    const own = steps.filter((g) => g.name === s.name || g.name.startsWith(`${s.name} (`));
    let state: NodeState = own.length ? "idle" : runStatus && runStatus !== "completed" ? "queued" : "idle";
    for (const g of own) {
      const next = stateOf(g);
      if (RANK[next] > RANK[state]) state = next;
    }
    // Alle eigenen Schritte fertig und keiner rot → grün, auch wenn einer übersprungen ist
    if (own.length && own.every((g) => g.status === "completed") && !own.some((g) => stateOf(g) === "failure")) {
      state = own.every((g) => g.conclusion === "skipped") ? "skipped" : "success";
    }
    out[s.id] = state;
  }
  return out;
}

/** Schritt-Namen müssen eindeutig sein, sonst ordnet die Live-Anzeige falsch zu. */
export function duplicateNames(p: CiPipeline): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const s of p.steps) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) dup.add(s.name);
    seen.add(key);
  }
  return [...dup];
}
