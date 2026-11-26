import { pick, randInt, type Rng } from "@/lib/random";
import { gcd, solveFraction, type FractionProblem, type Op } from "./fractions";

export type FractionLevel = 1 | 2 | 3 | 4;

export interface FractionLevelInfo {
  level: FractionLevel;
  name: string;
  emoji: string;
  description: string;
}

export const FRACTION_LEVELS: FractionLevelInfo[] = [
  { level: 1, name: "Warm-up", emoji: "🌱", description: "Same size pieces, add or take away" },
  { level: 2, name: "Explorer", emoji: "🧭", description: "Halves and quarters, thirds and sixths" },
  { level: 3, name: "Champion", emoji: "🏆", description: "Any pieces, add or take away" },
  { level: 4, name: "Legend", emoji: "🐉", description: "More than a whole tray, then glue" },
];

/** Pairs where one bottom number is a multiple of the other. */
const RELATED: [number, number][] = [
  [2, 4], [2, 6], [3, 6], [2, 8], [4, 8],
];

/** Pairs where neither bottom number goes into the other. */
const UNRELATED: [number, number][] = [
  [2, 3], [2, 5], [3, 4], [3, 5], [4, 5], [4, 6], [5, 6],
];

const ALL_DIFFERENT: [number, number][] = [...RELATED.filter(([, d]) => d <= 6), ...UNRELATED];

function randomFraction(rng: Rng, b: number, d: number, op: Op): FractionProblem {
  return { a: randInt(rng, 1, b - 1), b, c: randInt(rng, 1, d - 1), d, op };
}

function orderedPair(rng: Rng, pairs: [number, number][]): [number, number] {
  const [x, y] = pick(rng, pairs);
  return rng() < 0.5 ? [x, y] : [y, x];
}

interface Rules {
  pairs: (rng: Rng) => [number, number];
  ops: Op[];
  /** The answer must be bigger than 1 (true), smaller than 1 (false). */
  overOne: boolean;
  /** The fractional part must be simplifiable. */
  mustGlue: boolean;
}

const RULES: Record<FractionLevel, Rules> = {
  1: {
    pairs: (rng) => {
      const b = randInt(rng, 3, 8);
      return [b, b];
    },
    ops: ["+", "-"],
    overOne: false,
    mustGlue: false,
  },
  2: { pairs: (rng) => orderedPair(rng, RELATED), ops: ["+"], overOne: false, mustGlue: false },
  3: { pairs: (rng) => orderedPair(rng, UNRELATED), ops: ["+", "-"], overOne: false, mustGlue: false },
  4: { pairs: (rng) => orderedPair(rng, ALL_DIFFERENT), ops: ["+"], overOne: true, mustGlue: true },
};

/** True when the problem obeys a level's rules (also used by the tests). */
export function fitsLevel(problem: FractionProblem, level: FractionLevel): boolean {
  const rules = RULES[level];
  // Different-sized pieces are asked about in their simplest form (1/3, not 2/6).
  if (level > 1 && (gcd(problem.a, problem.b) > 1 || gcd(problem.c, problem.d) > 1)) return false;
  const s = solveFraction(problem);
  if (s.total <= 0 || s.total === s.denominator) return false;
  if (rules.overOne !== s.total > s.denominator) return false;
  if (rules.mustGlue && s.hcf === 1) return false;
  return true;
}

export function generateFractionProblem(level: FractionLevel, rng: Rng = Math.random): FractionProblem {
  const rules = RULES[level];
  for (let attempt = 0; attempt < 1000; attempt++) {
    const [b, d] = rules.pairs(rng);
    const problem = randomFraction(rng, b, d, pick(rng, rules.ops));
    if (fitsLevel(problem, level)) return problem;
  }
  throw new Error("Could not generate a problem");
}
