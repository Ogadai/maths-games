import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { canGlue, factorsOf, solveFraction, type FractionProblem } from "./fractions";
import { generateFractionProblem, type FractionLevel } from "./fractionGenerator";
import {
  badGlueFrame,
  boardAt,
  buildFractionScene,
  glueShape,
  narrate,
  practiceBeatIndex,
  practiceCaption,
  watchGlues,
  type FractionScene,
  type Rect,
} from "./fractionScene";

const scene = (p: FractionProblem, glues?: number[]) => {
  const s = solveFraction(p);
  return buildFractionScene(s, glues ?? watchGlues(s));
};

const kinds = (sc: FractionScene) => sc.beats.map((b) => b.kind);

function inside(r: Rect, t: Rect) {
  const e = 0.001;
  return r.x >= t.x - e && r.y >= t.y - e && r.x + r.w <= t.x + t.w + e && r.y + r.h <= t.y + t.h + e;
}

function overlaps(a: Rect, b: Rect) {
  const e = 0.001;
  return a.x < b.x + b.w - e && b.x < a.x + a.w - e && a.y < b.y + b.h - e && b.y < a.y + a.h - e;
}

describe("buildFractionScene", () => {
  it("cuts, counts and combines when the pieces differ", () => {
    const sc = scene({ a: 1, b: 2, c: 1, d: 3, op: "+" });
    expect(kinds(sc)).toEqual(["intro", "cut", "count", "combine", "finish"]);
    expect(sc.frames).toHaveLength(sc.beats.length);
    // 1/2 = 3 pieces of a 3 × 2 grid, 1/3 = 2 pieces.
    expect(sc.frames[0].pieces).toHaveLength(5);
  });

  it("skips cutting when the pieces already match", () => {
    expect(kinds(scene({ a: 1, b: 5, c: 2, d: 5, op: "+" }))).toEqual(["intro", "combine", "finish"]);
  });

  it("eats pieces when taking away", () => {
    const sc = scene({ a: 2, b: 3, c: 1, d: 4, op: "-" });
    expect(kinds(sc)).toEqual(["intro", "cut", "count", "combine", "eat", "finish"]);
    expect(sc.frames[beat(sc, "eat")].pieces).toHaveLength(5);
    expect(sc.frames[beat(sc, "eat")].bursts).toHaveLength(3);
  });

  it("spills into a second tray and glues the leftover", () => {
    const sc = scene({ a: 3, b: 4, c: 1, d: 2, op: "+" });
    expect(kinds(sc)).toEqual(["intro", "cut", "count", "combine", "overflow", "glue", "finish"]);
    const last = sc.frames.at(-1)!;
    const r1 = last.trays.find((t) => t.id === "R1")!;
    const r2 = last.trays.find((t) => t.id === "R2")!;
    expect(r1.whole).toBe(true);
    expect(last.pieces.filter((p) => inside(p, r1))).toHaveLength(8);
    expect(last.pieces.filter((p) => inside(p, r2))).toHaveLength(2);
    expect(r2.cols * r2.rows).toBe(4);
    expect(r2.label).toEqual({ kind: "fraction", n: 1, d: 4 });
  });

  it("keeps pieces inside their trays without overlapping, for every level", () => {
    for (const level of [1, 2, 3, 4] as FractionLevel[]) {
      const rng = createRng(level);
      for (let i = 0; i < 60; i++) {
        const sc = scene(generateFractionProblem(level, rng));
        for (const frame of sc.frames.slice(beat(sc, "combine") + 1)) {
          const answer = frame.trays.filter((t) => t.id.startsWith("R"));
          for (const p of frame.pieces) expect(answer.some((t) => inside(p, t))).toBe(true);
          for (let x = 0; x < frame.pieces.length; x++)
            for (let y = x + 1; y < frame.pieces.length; y++)
              expect(overlaps(frame.pieces[x], frame.pieces[y])).toBe(false);
        }
      }
    }
  });

  it("can glue by any valid group size, one after another", () => {
    const p: FractionProblem = { a: 1, b: 4, c: 1, d: 6, op: "+" }; // 6 + 4 = 10/24
    expect(kinds(scene(p, [2]))).toContain("glue");
    const q: FractionProblem = { a: 1, b: 4, c: 2, d: 6, op: "+" }; // 6 + 8 = 14/24
    const sc = scene(q, [2]);
    expect(sc.glueStates.at(-1)!.current).toEqual({ whole: 0, n: 7, d: 12 });
    expect(() => scene(q, [3])).toThrow();
  });

  it("finds a glue shape for every valid group size", () => {
    for (let rows = 1; rows <= 8; rows++)
      for (let cols = 2; cols <= 8; cols++)
        for (const k of factorsOf(rows * cols)) {
          const g = glueShape({ rows, cols }, { cellRows: 1, cellCols: 1 }, k);
          expect(g.cellRows * g.cellCols).toBe(k);
          expect(rows % g.cellRows).toBe(0);
          expect(cols % g.cellCols).toBe(0);
        }
  });
});

function beat(sc: FractionScene, kind: string) {
  return sc.beats.findIndex((b) => b.kind === kind);
}

describe("words and board", () => {
  const sc = scene({ a: 3, b: 4, c: 1, d: 2, op: "+" });

  it("narrates every beat", () => {
    sc.beats.forEach((_, i) => {
      expect(narrate(sc, i).length).toBeGreaterThan(10);
      expect(practiceCaption(sc, i).length).toBeGreaterThan(5);
    });
    expect(narrate(sc, sc.beats.length - 1)).toContain("1 whole and 1 quarter");
  });

  it("writes the working line by line", () => {
    const board = boardAt(sc, sc.beats.length - 1);
    expect(board).toEqual([
      { terms: [{ n: 3, d: 4 }, { n: 1, d: 2 }], op: "+" },
      { terms: [{ n: 6, d: 8 }, { n: 4, d: 8 }], op: "+" },
      { terms: [{ n: 10, d: 8 }] },
      { terms: [{ whole: 1, n: 2, d: 8 }] },
      { terms: [{ whole: 1, n: 1, d: 4 }] },
    ]);
    expect(boardAt(sc, 0)).toHaveLength(1);
  });

  it("keeps the practice picture one step behind", () => {
    expect(practiceBeatIndex(sc, "den")).toBe(0);
    expect(practiceBeatIndex(sc, "nA")).toBe(beat(sc, "cut"));
    expect(practiceBeatIndex(sc, "total")).toBe(beat(sc, "count"));
    expect(practiceBeatIndex(sc, "whole")).toBe(beat(sc, "combine"));
    expect(practiceBeatIndex(sc, "simplest")).toBe(beat(sc, "glue"));
    expect(practiceBeatIndex(sc, "done")).toBe(sc.beats.length - 1);
  });

  it("shows why a glue size doesn't work", () => {
    const plain = scene({ a: 1, b: 2, c: 1, d: 4, op: "+" }, []); // 6/8
    const at = practiceBeatIndex(plain, "glue");
    const leftover = badGlueFrame(plain, at, 4);
    expect(leftover.message).toContain("2 are left over");
    expect(leftover.frame.ghosts).toHaveLength(2);
    expect(leftover.frame.pieces.filter((p) => p.glow)).toHaveLength(2);
    const tray = badGlueFrame(plain, at, 3);
    expect(canGlue(6, 8, 3)).toBe(false);
    expect(tray.message).toContain("eighths");
    expect(tray.frame.ghosts).toHaveLength(2);
  });
});
