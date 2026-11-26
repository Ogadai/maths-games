import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { hasCarries, solveBusStop } from "./busStop";
import { generateProblem, type BusStopLevel } from "./busStopGenerator";

describe("solveBusStop", () => {
  it("works through 5432 ÷ 7 column by column", () => {
    const s = solveBusStop(5432, 7);
    expect(s.quotient).toBe(776);
    expect(s.remainder).toBe(0);
    expect(s.steps.map((x) => [x.working, x.quotientDigit, x.remainderOut])).toEqual([
      [5, 0, 5],
      [54, 7, 5],
      [53, 7, 4],
      [42, 6, 0],
    ]);
    expect(s.steps.map((x) => x.placeValue)).toEqual(["thousands", "hundreds", "tens", "ones"]);
  });

  it("reports the final remainder", () => {
    const s = solveBusStop(853, 4);
    expect(s.quotient).toBe(213);
    expect(s.remainder).toBe(1);
    expect(s.steps.at(-1)!.remainderOut).toBe(1);
  });

  it("satisfies quotient * divisor + remainder = dividend for many inputs", () => {
    const rng = createRng(42);
    for (let i = 0; i < 2000; i++) {
      const dividend = Math.floor(rng() * 100000);
      const divisor = 1 + Math.floor(rng() * 12);
      const s = solveBusStop(dividend, divisor);
      expect(s.quotient * divisor + s.remainder).toBe(dividend);
      const digits = Number(s.steps.map((x) => x.quotientDigit).join(""));
      expect(digits).toBe(s.quotient);
      for (const step of s.steps) {
        expect(step.quotientDigit).toBeLessThanOrEqual(9);
        expect(step.remainderOut).toBeLessThan(divisor);
      }
    }
  });

  it("rejects invalid input", () => {
    expect(() => solveBusStop(10, 0)).toThrow();
    expect(() => solveBusStop(-5, 2)).toThrow();
  });
});

describe("generateProblem", () => {
  const rng = createRng(7);
  const sample = (level: BusStopLevel) =>
    Array.from({ length: 500 }, () => solveBusStop(...args(generateProblem(level, rng))));
  const args = (p: { dividend: number; divisor: number }) => [p.dividend, p.divisor] as const;

  it("level 1: 2-3 digits, divisor 2-4, no carries, no remainder", () => {
    for (const s of sample(1)) {
      expect(s.dividend).toBeGreaterThanOrEqual(10);
      expect(s.dividend).toBeLessThanOrEqual(999);
      expect(s.divisor).toBeGreaterThanOrEqual(2);
      expect(s.divisor).toBeLessThanOrEqual(4);
      expect(hasCarries(s)).toBe(false);
      expect(s.remainder).toBe(0);
    }
  });

  it("level 2: 3 digits, divisor 2-9, carries, no remainder", () => {
    for (const s of sample(2)) {
      expect(String(s.dividend)).toHaveLength(3);
      expect(s.divisor).toBeGreaterThanOrEqual(2);
      expect(s.divisor).toBeLessThanOrEqual(9);
      expect(hasCarries(s)).toBe(true);
      expect(s.remainder).toBe(0);
    }
  });

  it("level 3: 4 digits, divisor 2-9, carries, some with remainders", () => {
    const all = sample(3);
    for (const s of all) {
      expect(String(s.dividend)).toHaveLength(4);
      expect(s.divisor).toBeLessThanOrEqual(9);
      expect(hasCarries(s)).toBe(true);
    }
    expect(all.some((s) => s.remainder > 0)).toBe(true);
    expect(all.some((s) => s.remainder === 0)).toBe(true);
  });

  it("level 4: 4 digits, divisor up to 12, always a remainder", () => {
    const all = sample(4);
    for (const s of all) {
      expect(String(s.dividend)).toHaveLength(4);
      expect(s.divisor).toBeLessThanOrEqual(12);
      expect(hasCarries(s)).toBe(true);
      expect(s.remainder).toBeGreaterThan(0);
    }
    expect(all.some((s) => s.divisor > 10)).toBe(true);
  });
});
