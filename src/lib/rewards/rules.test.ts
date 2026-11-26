import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { JOKES } from "@/data/jokes";
import {
  emptyProgress,
  MEDALS,
  nextJoke,
  recordSolve,
  scoreProblem,
  streakMultiplier,
  type Progress,
  type SolvedProblem,
} from "./rules";

const problem = (overrides: Partial<SolvedProblem> = {}): SolvedProblem => ({
  topic: "bus-stop-division",
  level: 1,
  hintsUsed: 0,
  mistakes: 0,
  hadRemainder: false,
  ...overrides,
});

function solveMany(n: number, overrides: Partial<SolvedProblem> = {}, start = emptyProgress()) {
  let progress: Progress = start;
  const earned: string[][] = [];
  for (let i = 0; i < n; i++) {
    const result = recordSolve(progress, problem(overrides));
    progress = result.progress;
    earned.push(result.newMedals);
  }
  return { progress, earned };
}

describe("scoring", () => {
  it("gives base points by level, plus 5 with no hints", () => {
    expect(scoreProblem(problem({ level: 1, hintsUsed: 1 }), 0).total).toBe(10);
    expect(scoreProblem(problem({ level: 2, hintsUsed: 1 }), 0).total).toBe(20);
    expect(scoreProblem(problem({ level: 3, hintsUsed: 1 }), 0).total).toBe(30);
    expect(scoreProblem(problem({ level: 4, hintsUsed: 1 }), 0).total).toBe(50);
    expect(scoreProblem(problem({ level: 4 }), 0).total).toBe(55);
  });

  it("multiplies by 1.5 from a streak of 3 and by 2 from 5", () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.5);
    expect(streakMultiplier(4)).toBe(1.5);
    expect(streakMultiplier(5)).toBe(2);
    expect(streakMultiplier(12)).toBe(2);
    // Third in a row: (10 + 5) * 1.5 = 22.5, rounded.
    expect(scoreProblem(problem(), 2)).toMatchObject({ streak: 3, multiplier: 1.5, total: 23 });
    expect(scoreProblem(problem({ level: 2 }), 4)).toMatchObject({ streak: 5, total: 50 });
  });

  it("never takes points away for mistakes, it just resets the streak", () => {
    const score = scoreProblem(problem({ mistakes: 3 }), 7);
    expect(score).toMatchObject({ streak: 0, multiplier: 1, total: 15 });
  });

  it("adds up points and streak across problems", () => {
    const { progress } = solveMany(5);
    // 15 + 15 + 23 + 23 + 30
    expect(progress.points).toBe(106);
    expect(progress.streak).toBe(5);
    expect(progress.bestStreak).toBe(5);
    const after = recordSolve(progress, problem({ mistakes: 1 })).progress;
    expect(after.streak).toBe(0);
    expect(after.bestStreak).toBe(5);
  });
});

describe("medals", () => {
  it("awards Bronze at 5, Silver at 15 and Gold at 30 solved, once each", () => {
    const { progress, earned } = solveMany(30, { hintsUsed: 1, mistakes: 1 });
    const when = (id: string) => earned.findIndex((ids) => ids.includes(id)) + 1;
    expect(when("bus-stop-division:bronze")).toBe(5);
    expect(when("bus-stop-division:silver")).toBe(15);
    expect(when("bus-stop-division:gold")).toBe(30);
    expect(progress.medals).toEqual([
      "bus-stop-division:bronze",
      "bus-stop-division:silver",
      "bus-stop-division:gold",
    ]);
  });

  it("awards the fun badges", () => {
    expect(solveMany(5).progress.medals).toContain("streak-star");
    expect(solveMany(4).progress.medals).not.toContain("streak-star");
    expect(solveMany(10, { mistakes: 1 }).progress.medals).toContain("no-hint-hero");
    expect(solveMany(9, { mistakes: 1 }).progress.medals).not.toContain("no-hint-hero");
    expect(solveMany(1, { level: 4 }).progress.medals).toEqual(["legend-cleared"]);
    expect(solveMany(5, { hadRemainder: true, mistakes: 1 }).progress.medals).toContain("remainder-wrangler");
    expect(solveMany(4, { hadRemainder: true }).progress.medals).not.toContain("remainder-wrangler");
  });

  it("has unique ids", () => {
    expect(new Set(MEDALS.map((m) => m.id)).size).toBe(MEDALS.length);
  });
});

describe("jokes", () => {
  it("has about 100 jokes with no repeats", () => {
    expect(JOKES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(JOKES.map((j) => j.setup)).size).toBe(JOKES.length);
  });

  it("shows every joke once before any repeats", () => {
    const rng = createRng(42);
    let seen: number[] = [];
    const shown: number[] = [];
    for (let i = 0; i < JOKES.length; i++) {
      const next = nextJoke(seen, JOKES.length, rng);
      shown.push(next.index);
      seen = next.seen;
    }
    expect(new Set(shown).size).toBe(JOKES.length);

    // The next round starts afresh, without repeating the joke just shown.
    const next = nextJoke(seen, JOKES.length, rng);
    expect(next.index).not.toBe(shown[shown.length - 1]);
    expect(next.seen).toEqual([next.index]);
  });
});
