import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { gcd, solveFraction, type FractionProblem } from "./fractions";
import { generateFractionProblem, type FractionLevel } from "./fractionGenerator";
import { buildFractionScene, practiceBeatIndex } from "./fractionScene";
import {
  answerSimplest,
  applyAnswer,
  currentPart,
  glueSizes,
  hintFor,
  practiceBoard,
  startPractice,
  type PracticeState,
} from "./fractionPractice";

const start = (p: FractionProblem) => startPractice(solveFraction(p));

/** Answer every step correctly, gluing by the smallest group size each time. */
function solveFully(s: PracticeState): { state: PracticeState; steps: string[] } {
  const steps: string[] = [];
  const sol = s.solution;
  for (let guard = 0; guard < 30 && s.ask !== "done"; guard++) {
    steps.push(s.ask);
    expect(hintFor(s).length).toBeGreaterThan(0);
    // The picture can always be drawn for the current step.
    const scene = buildFractionScene(sol, glueSizes(s));
    expect(scene.frames[practiceBeatIndex(scene, s.ask)]).toBeDefined();
    const { n, d } = currentPart(s);
    const last = s.glues.at(-1);
    switch (s.ask) {
      case "den": s = applyAnswer(s, sol.denominator); break;
      case "nA": s = applyAnswer(s, sol.nA); break;
      case "nB": s = applyAnswer(s, sol.nB); break;
      case "total": s = applyAnswer(s, sol.total); break;
      case "whole": s = applyAnswer(s, 1); break;
      case "rest": s = applyAnswer(s, sol.mixed.n); break;
      case "simplest": s = answerSimplest(s, gcd(n, d) === 1); break;
      case "glue": {
        let k = 2;
        while (n % k || d % k) k++;
        s = applyAnswer(s, k);
        break;
      }
      case "glueN": s = applyAnswer(s, n / last!.k); break;
      case "glueD": s = applyAnswer(s, d / last!.k); break;
    }
    expect(s.tone).not.toBe("oops");
  }
  return { state: s, steps };
}

describe("practice flow", () => {
  it("walks through cutting, counting and adding", () => {
    const { state, steps } = solveFully(start({ a: 1, b: 2, c: 1, d: 3, op: "+" }));
    expect(steps).toEqual(["den", "nA", "nB", "total", "simplest"]);
    expect(state.message).toContain("5 sixths");
    expect(state.mistakes).toBe(0);
  });

  it("goes straight to the total when the pieces match", () => {
    expect(start({ a: 1, b: 5, c: 2, d: 5, op: "+" }).ask).toBe("total");
  });

  it("handles over 1 and gluing", () => {
    const { state, steps } = solveFully(start({ a: 3, b: 4, c: 1, d: 2, op: "+" }));
    expect(steps).toEqual(["den", "nA", "nB", "total", "whole", "rest", "simplest", "glue", "glueN", "glueD", "simplest"]);
    expect(state.message).toContain("1 whole and 1 quarter");
    expect(practiceBoard(state).lines.at(-1)).toEqual({ terms: [{ whole: 1, n: 1, d: 4 }] });
  });

  it("can glue more than once", () => {
    // 3/8 + 1/8 = 4/8: glue in 2s → 2/4, glue in 2s again → 1/2.
    const { state, steps } = solveFully(start({ a: 3, b: 8, c: 1, d: 8, op: "+" }));
    expect(steps.filter((x) => x === "glue")).toHaveLength(2);
    expect(currentPart(state)).toEqual({ n: 1, d: 2 });
  });

  it("solves every generated problem on every level", () => {
    for (const level of [1, 2, 3, 4] as FractionLevel[]) {
      const rng = createRng(level * 13);
      for (let i = 0; i < 40; i++) {
        const { state } = solveFully(start(generateFractionProblem(level, rng)));
        expect(state.ask).toBe("done");
      }
    }
  });
});

describe("wrong answers", () => {
  it("counts a mistake and shows why", () => {
    const s = applyAnswer(start({ a: 1, b: 2, c: 1, d: 3, op: "+" }), 5);
    expect(s.tone).toBe("oops");
    expect(s.mistakes).toBe(1);
    expect(s.whatIf).toEqual({ kind: "cut" });
    expect(s.ask).toBe("den");
  });

  it("is gentle about the lowest common denominator", () => {
    const s = applyAnswer(start({ a: 1, b: 2, c: 1, d: 4, op: "+" }), 4);
    expect(s.tone).toBe("neutral");
    expect(s.mistakes).toBe(0);
    expect(s.message).toContain("2 × 4");
  });

  it("rejects a glue size that doesn't fit", () => {
    let s = start({ a: 1, b: 2, c: 1, d: 4, op: "+" }); // 6/8
    for (const v of [8, 4, 2, 6]) s = applyAnswer(s, v);
    expect(s.ask).toBe("simplest");
    s = answerSimplest(s, true);
    expect(s.tone).toBe("oops");
    s = answerSimplest(s, false);
    expect(s.ask).toBe("glue");
    s = applyAnswer(s, 4);
    expect(s.whatIf).toEqual({ kind: "glue", k: 4 });
    expect(s.ask).toBe("glue");
  });

  it("puts the answer box in the right place", () => {
    let s = start({ a: 1, b: 2, c: 1, d: 3, op: "+" });
    expect(practiceBoard(s).active).toEqual({ line: 1, term: 0, part: "d" });
    s = applyAnswer(s, 6);
    expect(practiceBoard(s).active).toEqual({ line: 1, term: 0, part: "n" });
    s = applyAnswer(applyAnswer(s, 3), 2);
    expect(practiceBoard(s).active).toEqual({ line: 2, term: 0, part: "n" });
  });
});
