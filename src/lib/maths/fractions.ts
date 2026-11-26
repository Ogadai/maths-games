/**
 * Adding and subtracting fractions the "traybake" way: cut both trays into the
 * same grid (b × d pieces), count pieces, add or take away, then glue pieces
 * back together to simplify. Pure functions only.
 */

export type Op = "+" | "-";

/** a/b op c/d */
export interface FractionProblem {
  a: number;
  b: number;
  c: number;
  d: number;
  op: Op;
}

export interface MixedFraction {
  /** 0 or 1 (two proper fractions never make 2). */
  whole: number;
  /** Top of the fractional part (0 when the answer is a whole number). */
  n: number;
  /** Bottom of the fractional part. */
  d: number;
}

export interface FractionSolution {
  problem: FractionProblem;
  /** Both fractions already have the same bottom number, so no cutting is needed. */
  sameDenominator: boolean;
  /** Grid every tray ends up cut into: rows × cols = denominator. */
  rows: number;
  cols: number;
  /** The common denominator (b × d, or b when they already match). */
  denominator: number;
  /** a/b and c/d written as pieces of the common denominator. */
  nA: number;
  nB: number;
  /** Pieces after adding or taking away. */
  total: number;
  /** total as a mixed number, before simplifying. */
  mixed: MixedFraction;
  /** The highest common factor of the fractional part (1 = already simplest). */
  hcf: number;
  /** Fully simplified answer. */
  simplest: MixedFraction;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

export function solveFraction(problem: FractionProblem): FractionSolution {
  const { a, b, c, d, op } = problem;
  const sameDenominator = b === d;
  const rows = sameDenominator ? 1 : d;
  const cols = b;
  const denominator = rows * cols;
  const nA = a * rows;
  const nB = sameDenominator ? c : c * cols;
  const total = op === "+" ? nA + nB : nA - nB;
  const whole = total >= denominator ? 1 : 0;
  const n = total - whole * denominator;
  const mixed = { whole, n, d: denominator };
  const hcf = n === 0 ? 1 : gcd(n, denominator);
  return {
    problem,
    sameDenominator,
    rows,
    cols,
    denominator,
    nA,
    nB,
    total,
    mixed,
    hcf,
    simplest: n === 0 ? { whole, n: 0, d: 1 } : { whole, n: n / hcf, d: denominator / hcf },
  };
}

/** Can n/d pieces be glued into groups of k (so k goes into both)? */
export function canGlue(n: number, d: number, k: number): boolean {
  return k > 1 && n > 0 && n % k === 0 && d % k === 0;
}

/** Numbers bigger than 1 that go into n (for hints). */
export function factorsOf(n: number): number[] {
  const out: number[] = [];
  for (let k = 2; k <= n; k++) if (n % k === 0) out.push(k);
  return out;
}

// ---------------------------------------------------------------------------
// Words (used on screen and read aloud, so "3/6" never gets read as a date)
// ---------------------------------------------------------------------------

const UNIT_ORDINALS = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth",
  "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth",
  "seventeenth", "eighteenth", "nineteenth",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function ordinal(n: number): string {
  if (n < 20) return UNIT_ORDINALS[n];
  const tens = Math.floor(n / 10);
  const units = n % 10;
  if (units === 0) return `${TENS[tens].slice(0, -1)}ieth`;
  return `${TENS[tens]}-${UNIT_ORDINALS[units]}`;
}

/** The name of one piece: "half", "third", "quarter", "twelfth". */
export function pieceName(d: number, plural = false): string {
  if (d === 2) return plural ? "halves" : "half";
  if (d === 4) return plural ? "quarters" : "quarter";
  const name = ordinal(d);
  return plural ? `${name}s` : name;
}

/** "1 half", "3 sixths", "1 whole and 1 quarter". */
export function fractionWords(n: number, d: number, whole = 0): string {
  const part = n === 0 ? "" : `${n} ${pieceName(d, n !== 1)}`;
  if (!whole) return part || "0";
  const w = `${whole} whole`;
  return part ? `${w} and ${part}` : w;
}

export function mixedWords(m: MixedFraction): string {
  return fractionWords(m.n, m.d, m.whole);
}


/** Checks a home-made problem fits on the trays. Returns an error message, or null. */
export function ownProblemError(p: FractionProblem): string | null {
  if (!(p.b >= 2 && p.b <= 8 && p.d >= 2 && p.d <= 8)) return "Bottom numbers from 2 to 8, please.";
  if (!(p.a >= 1 && p.a < p.b && p.c >= 1 && p.c < p.d)) return "Top numbers must be smaller than the bottom ones.";
  if (p.b !== p.d && p.b * p.d > 48) return "That's too many pieces for the tray! Try smaller bottom numbers.";
  if (p.op === "-" && p.a * p.d <= p.c * p.b) return "Take away a smaller fraction from a bigger one.";
  return null;
}
