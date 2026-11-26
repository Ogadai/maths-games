import { pick, randInt, type Rng } from "@/lib/random";
import { hasCarries, solveBusStop } from "./busStop";

export type BusStopLevel = 1 | 2 | 3 | 4;

export interface BusStopLevelInfo {
  level: BusStopLevel;
  name: string;
  emoji: string;
  description: string;
}

export const BUS_STOP_LEVELS: BusStopLevelInfo[] = [
  { level: 1, name: "Warm-up", emoji: "🌱", description: "Small numbers, no leftovers" },
  { level: 2, name: "Explorer", emoji: "🧭", description: "3 digits with carrying" },
  { level: 3, name: "Champion", emoji: "🏆", description: "4 digits, maybe a remainder" },
  { level: 4, name: "Legend", emoji: "🐉", description: "Big numbers, divide by up to 12" },
];

export interface BusStopProblem {
  dividend: number;
  divisor: number;
}

/** Level 1: every dividend digit divides exactly, so there is never a carry. */
function generateWarmUp(rng: Rng): BusStopProblem {
  const divisor = randInt(rng, 2, 4);
  const length = randInt(rng, 2, 3);
  const maxQ = Math.floor(9 / divisor);
  let dividend = 0;
  for (let i = 0; i < length; i++) {
    const q = randInt(rng, i === 0 ? 1 : 0, maxQ);
    dividend = dividend * 10 + q * divisor;
  }
  return { dividend, divisor };
}

interface Rules {
  minDividend: number;
  maxDividend: number;
  divisors: number[];
  remainder: "none" | "required" | "optional";
}

const RULES: Record<Exclude<BusStopLevel, 1>, Rules> = {
  2: { minDividend: 100, maxDividend: 999, divisors: [2, 3, 4, 5, 6, 7, 8, 9], remainder: "none" },
  3: { minDividend: 1000, maxDividend: 9999, divisors: [2, 3, 4, 5, 6, 7, 8, 9], remainder: "optional" },
  4: { minDividend: 1000, maxDividend: 9999, divisors: [3, 4, 5, 6, 7, 8, 9, 11, 12], remainder: "required" },
};

/**
 * Build the problem as divisor * quotient + remainder so the level's rules hold,
 * rejecting anything without carries (too easy for levels 2+).
 */
function generateFromRules(rng: Rng, rules: Rules): BusStopProblem {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const divisor = pick(rng, rules.divisors);
    const wantRemainder =
      rules.remainder === "required" || (rules.remainder === "optional" && rng() < 0.5);
    const remainder = wantRemainder ? randInt(rng, 1, divisor - 1) : 0;
    const minQ = Math.ceil((rules.minDividend - remainder) / divisor);
    const maxQ = Math.floor((rules.maxDividend - remainder) / divisor);
    const quotient = randInt(rng, minQ, maxQ);
    const dividend = divisor * quotient + remainder;
    if (dividend < rules.minDividend || dividend > rules.maxDividend) continue;
    if (!hasCarries(solveBusStop(dividend, divisor))) continue;
    return { dividend, divisor };
  }
  throw new Error("Could not generate a problem");
}

export function generateProblem(level: BusStopLevel, rng: Rng = Math.random): BusStopProblem {
  if (level === 1) return generateWarmUp(rng);
  return generateFromRules(rng, RULES[level]);
}
