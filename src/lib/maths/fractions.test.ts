import { describe, expect, it } from "vitest";
import { canGlue, factorsOf, fractionWords, gcd, lcm, pieceName, solveFraction } from "./fractions";

describe("solveFraction", () => {
  it("cuts both trays into b × d pieces", () => {
    const s = solveFraction({ a: 1, b: 2, c: 1, d: 3, op: "+" });
    expect(s).toMatchObject({ rows: 3, cols: 2, denominator: 6, nA: 3, nB: 2, total: 5, hcf: 1 });
    expect(s.mixed).toEqual({ whole: 0, n: 5, d: 6 });
    expect(s.simplest).toEqual({ whole: 0, n: 5, d: 6 });
  });

  it("uses b × d even when a smaller denominator would do, then simplifies", () => {
    const s = solveFraction({ a: 1, b: 2, c: 1, d: 4, op: "+" });
    expect(s.denominator).toBe(8);
    expect(s.total).toBe(6);
    expect(s.hcf).toBe(2);
    expect(s.simplest).toEqual({ whole: 0, n: 3, d: 4 });
  });

  it("leaves matching denominators uncut", () => {
    const s = solveFraction({ a: 2, b: 6, c: 2, d: 6, op: "+" });
    expect(s).toMatchObject({ sameDenominator: true, rows: 1, cols: 6, denominator: 6, nA: 2, nB: 2, total: 4 });
    expect(s.simplest).toEqual({ whole: 0, n: 2, d: 3 });
  });

  it("takes away", () => {
    const s = solveFraction({ a: 2, b: 3, c: 1, d: 4, op: "-" });
    expect(s).toMatchObject({ denominator: 12, nA: 8, nB: 3, total: 5 });
  });

  it("turns answers over 1 into mixed numbers", () => {
    const s = solveFraction({ a: 3, b: 4, c: 1, d: 2, op: "+" });
    expect(s).toMatchObject({ denominator: 8, total: 10 });
    expect(s.mixed).toEqual({ whole: 1, n: 2, d: 8 });
    expect(s.simplest).toEqual({ whole: 1, n: 1, d: 4 });
  });

  it("cuts both trays into strips of a smaller common denominator when asked", () => {
    const s = solveFraction({ a: 1, b: 2, c: 1, d: 4, op: "+" }, 4);
    expect(s).toMatchObject({ mode: "strips", rows: 1, cols: 4, denominator: 4, nA: 2, nB: 1, total: 3 });
    const t = solveFraction({ a: 5, b: 6, c: 3, d: 4, op: "+" }, 12);
    expect(t).toMatchObject({ mode: "strips", denominator: 12, nA: 10, nB: 9, total: 19 });
    expect(t.mixed).toEqual({ whole: 1, n: 7, d: 12 });
    // b × d (or anything that isn't a smaller common denominator) keeps the grid.
    expect(solveFraction({ a: 1, b: 2, c: 1, d: 4, op: "+" }, 8).mode).toBe("grid");
    expect(solveFraction({ a: 1, b: 2, c: 1, d: 4, op: "+" }, 6).mode).toBe("grid");
    expect(solveFraction({ a: 1, b: 2, c: 1, d: 3, op: "+" }).mode).toBe("grid");
  });

  it("handles an answer of exactly 1", () => {
    const s = solveFraction({ a: 1, b: 2, c: 1, d: 2, op: "+" });
    expect(s.mixed).toEqual({ whole: 1, n: 0, d: 2 });
    expect(s.simplest.whole).toBe(1);
    expect(s.simplest.n).toBe(0);
  });
});

describe("helpers", () => {
  it("gcd, lcm and factors", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(factorsOf(12)).toEqual([2, 3, 4, 6, 12]);
  });

  it("canGlue needs a group size that goes into both", () => {
    expect(canGlue(4, 8, 2)).toBe(true);
    expect(canGlue(4, 8, 4)).toBe(true);
    expect(canGlue(4, 8, 3)).toBe(false);
    expect(canGlue(6, 8, 3)).toBe(false);
    expect(canGlue(4, 8, 1)).toBe(false);
  });

  it("names pieces", () => {
    expect(pieceName(2)).toBe("half");
    expect(pieceName(4, true)).toBe("quarters");
    expect(pieceName(12, true)).toBe("twelfths");
    expect(pieceName(20)).toBe("twentieth");
    expect(pieceName(30, true)).toBe("thirtieths");
    expect(pieceName(32, true)).toBe("thirty-seconds");
    expect(fractionWords(1, 2)).toBe("1 half");
    expect(fractionWords(3, 6)).toBe("3 sixths");
    expect(fractionWords(1, 4, 1)).toBe("1 whole and 1 quarter");
    expect(fractionWords(0, 4, 1)).toBe("1 whole");
  });
});
