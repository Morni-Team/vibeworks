import { describe, expect, it } from "vitest";
import { nextSummary, rankNextSteps, taskReason, type NextStep } from "./nextStepsLogic";

const step = (reason: NextStep["reason"], extra: Partial<NextStep> = {}): NextStep => ({ reason, what: reason, next: "list_problems", ...extra });

describe("Was ist als Nächstes dran? (#192)", () => {
  it("stellt Dringendes nach vorn", () => {
    const sorted = rankNextSteps([step("taskImportant"), step("secrets"), step("appError"), step("siteDown")]);
    expect(sorted.map((s) => s.reason)).toEqual(["secrets", "siteDown", "appError", "taskImportant"]);
  });

  it("bevorzugt bei gleichem Grund, was ein Mensch angelegt hat", () => {
    const sorted = rankNextSteps([step("taskToday", { what: "von der KI" }), step("taskToday", { what: "von Moini", fromUser: true })]);
    expect(sorted.map((s) => s.what)).toEqual(["von Moini", "von der KI"]);
  });

  it("kürzt auf die gewünschte Zahl, mindestens aber einen", () => {
    const viele = Array.from({ length: 30 }, () => step("appError"));
    expect(rankNextSteps(viele, 5)).toHaveLength(5);
    expect(rankNextSteps(viele, 0)).toHaveLength(1);
  });

  it("zählt Dringendes und Aufgaben getrennt", () => {
    expect(nextSummary([step("secrets"), step("redCi"), step("taskToday"), step("taskBlocked")])).toEqual({ urgent: 2, tasks: 2, total: 4 });
  });

  it("findet je Aufgabe den dringendsten Grund", () => {
    const heute = "2026-09-23";
    expect(taskReason({ status: "TODO", dueDate: "2026-09-20", priority: 2 }, heute)).toBe("taskOverdue");
    expect(taskReason({ status: "BLOCKED", dueDate: null, priority: 1 }, heute)).toBe("taskBlocked");
    expect(taskReason({ status: "TODO", dueDate: heute, priority: 1 }, heute)).toBe("taskToday");
    expect(taskReason({ status: "DOING", dueDate: null, priority: 2 }, heute)).toBe("taskDoing");
    expect(taskReason({ status: "TODO", dueDate: null, priority: 4 }, heute)).toBe("taskImportant");
    // Nichts davon: ruhige Aufgabe ohne Termin
    expect(taskReason({ status: "TODO", dueDate: null, priority: 2 }, heute)).toBeNull();
    expect(taskReason({ status: "DONE", dueDate: "2026-09-01", priority: 4 }, heute)).toBeNull();
  });
});
