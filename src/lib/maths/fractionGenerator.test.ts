import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { gcd, solveFraction } from "./fractions";
import { fitsLevel, generateFractionProblem, type FractionLevel } from "./fractionGenerator";

const LEVELS: FractionLevel[] = [1, 2, 3, 4];

describe("generateFractionProblem", () => {
  it.each(LEVELS)("level %i always follows its rules", (level) => {
    const rng = createRng(level * 101);
    for (let i = 0; i < 300; i++) {
      const p = generateFractionProblem(level, rng);
      expect(fitsLevel(p, level)).toBe(true);
      expect(p.a).toBeGreaterThan(0);
      expect(p.a).toBeLessThan(p.b);
      expect(p.c).toBeGreaterThan(0);
      expect(p.c).toBeLessThan(p.d);
      if (level > 1) expect([gcd(p.a, p.b), gcd(p.c, p.d)]).toEqual([1, 1]);
      const s = solveFraction(p);
      expect(s.denominator).toBeLessThanOrEqual(36);
      expect(s.total).toBeLessThan(100);
    }
  });

  it("level 1 keeps the same bottom number", () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const p = generateFractionProblem(1, rng);
      expect(p.b).toBe(p.d);
    }
  });

  it("level 2 uses related bottom numbers and only adds", () => {
    const rng = createRng(8);
    for (let i = 0; i < 100; i++) {
      const p = generateFractionProblem(2, rng);
      expect(Math.max(p.b, p.d) % Math.min(p.b, p.d)).toBe(0);
      expect(p.b).not.toBe(p.d);
      expect(p.op).toBe("+");
    }
  });

  it("level 3 uses unrelated bottom numbers, with some take-aways", () => {
    const rng = createRng(9);
    const ops = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const p = generateFractionProblem(3, rng);
      expect(Math.max(p.b, p.d) % Math.min(p.b, p.d)).not.toBe(0);
      ops.add(p.op);
    }
    expect(ops).toEqual(new Set(["+", "-"]));
  });

  it("level 4 answers are over 1 and need gluing", () => {
    const rng = createRng(10);
    for (let i = 0; i < 100; i++) {
      const s = solveFraction(generateFractionProblem(4, rng));
      expect(s.mixed.whole).toBe(1);
      expect(s.mixed.n).toBeGreaterThan(0);
      expect(s.hcf).toBeGreaterThan(1);
    }
  });
});
