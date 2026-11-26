/**
 * The step-by-step practice flow for one fraction problem. Pure, so the
 * panel just renders it and the tests can walk through whole problems.
 */
import {
  canGlue,
  factorsOf,
  fractionWords as fw,
  gcd,
  isSmallerCommonDenominator,
  mixedWords,
  pieceName,
  solveFraction,
  type FractionSolution,
} from "./fractions";
import type { BoardLine, FractionAsk, SlotPath } from "./fractionScene";

/** Names for the answer box at each step (also used by screen readers and tests). */
export const ASK_LABELS: Record<FractionAsk, string> = {
  den: "Pieces in each tray",
  nA: "Pieces in the first fraction",
  nB: "Pieces in the second fraction",
  total: "Pieces altogether",
  whole: "Whole trays",
  rest: "Pieces in the second tray",
  simplest: "",
  glue: "Group size",
  glueN: "Big pieces with topping",
  glueD: "Big pieces in the tray",
  done: "",
};

export type Tone = "neutral" | "success" | "oops";

/** The last wrong answer, so the picture can show why. */
export type WhatIf = { kind: "cut" } | { kind: "strip" } | { kind: "row" } | { kind: "glue"; k: number } | null;

export interface GlueAnswer {
  k: number;
  n: number | null;
  d: number | null;
}

export interface PracticeState {
  solution: FractionSolution;
  ask: FractionAsk;
  den: number | null;
  nA: number | null;
  nB: number | null;
  total: number | null;
  whole: number | null;
  rest: number | null;
  glues: GlueAnswer[];
  message: string;
  tone: Tone;
  /** Wrong answers on the current step (the hint opens after two). */
  wrongOnStep: number;
  /** Wrong answers anywhere in this problem (any mistake resets the streak). */
  mistakes: number;
  whatIf: WhatIf;
}

const opVerb = (s: FractionSolution) => (s.problem.op === "+" ? "altogether" : "left");

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function startPractice(solution: FractionSolution): PracticeState {
  const { b, d, op } = solution.problem;
  const message = solution.sameDenominator
    ? `Let's go! Both trays are cut into ${pieceName(b, true)}. ${op === "+" ? "Put them together" : "Take tray 2's pieces away"}: how many pieces ${opVerb(solution)}?`
    : `Let's go! ${capitalise(pieceName(b, true))} and ${pieceName(d, true)} don't match. If we cut both trays both ways, how many pieces will each tray have?`;
  return {
    solution,
    ask: solution.sameDenominator ? "total" : "den",
    den: null,
    nA: null,
    nB: null,
    total: null,
    whole: null,
    rest: null,
    glues: [],
    message,
    tone: "neutral",
    wrongOnStep: 0,
    mistakes: 0,
    whatIf: null,
  };
}

/** The fraction (fractional part) as it stands after the glues finished so far. */
export function currentPart(s: PracticeState): { n: number; d: number } {
  let n = s.solution.mixed.n;
  let d = s.solution.mixed.d;
  for (const g of s.glues) {
    if (g.n === null || g.d === null) break;
    n = g.n;
    d = g.d;
  }
  return { n, d };
}

/** Group sizes the student has glued with (including one being counted). */
export const glueSizes = (s: PracticeState) => s.glues.map((g) => g.k);

const correct = (s: PracticeState, next: Partial<PracticeState>): PracticeState => ({
  ...s,
  tone: "success",
  wrongOnStep: 0,
  whatIf: null,
  ...next,
});

const wrong = (s: PracticeState, message: string, whatIf: WhatIf = null): PracticeState => ({
  ...s,
  message,
  tone: "oops",
  wrongOnStep: s.wrongOnStep + 1,
  mistakes: s.mistakes + 1,
  whatIf,
});

function askSimplest(s: PracticeState, intro: string): PracticeState {
  const { n, d } = currentPart(s);
  return correct(s, {
    ask: "simplest",
    message: `${intro} Is ${fw(n, d)} as simple as it gets, or can we glue pieces together?`,
  });
}

function finish(s: PracticeState): PracticeState {
  const { problem } = s.solution;
  const { n, d } = currentPart(s);
  const answer = mixedWords({ whole: s.solution.mixed.whole, n, d });
  return correct(s, {
    ask: "done",
    message: `🎉 You did it! ${fw(problem.a, problem.b)} ${problem.op === "+" ? "plus" : "take away"} ${fw(problem.c, problem.d)} is ${answer}.`,
  });
}

/** Work out what happens after a typed answer. */
export function applyAnswer(s: PracticeState, value: number): PracticeState {
  const sol = s.solution;
  const { a, b, c, d, op } = sol.problem;
  const D = sol.denominator;
  switch (s.ask) {
    case "den": {
      if (value === D)
        return correct(s, {
          den: value,
          ask: "nA",
          message: `Yes! ${b} × ${d} = ${D} pieces in each tray. How many pieces is ${fw(a, b)} now?`,
        });
      if (isSmallerCommonDenominator(sol.problem, value)) {
        // A smaller common denominator works too: switch to cutting both trays into strips.
        return correct(s, {
          solution: solveFraction(sol.problem, value),
          den: value,
          ask: "nA",
          message: `Yes, clever! ${b} and ${d} both go into ${value}. Turn tray 2 round and cut both trays into ${value} strips. How many pieces is ${fw(a, b)} now?`,
        });
      }
      if (value > D && value % b === 0 && value % d === 0)
        // Not wrong, just more pieces than we need, so no mistake is counted.
        return {
          ...s,
          tone: "neutral",
          message: `${value} works, but that's lots of tiny pieces! Try a smaller number that ${b} and ${d} both go into.`,
        };
      return wrong(
        s,
        `Not quite! Tray 1 has ${b} columns. Cut it into ${d} rows as well: how many pieces is that?`,
        { kind: "cut" },
      );
    }
    case "nA":
      if (value === sol.nA)
        return correct(s, {
          nA: value,
          ask: "nB",
          message: `Yes! ${fw(a, b)} = ${fw(sol.nA, D)}. And how many pieces is ${fw(c, d)}?`,
        });
      return wrong(s, `Not quite. Each ${pieceName(b)} is now ${D / b} pieces. Count the caramel pieces!`, { kind: "strip" });
    case "nB":
      if (value === sol.nB)
        return correct(s, {
          nB: value,
          ask: "total",
          message: `Great! ${fw(c, d)} = ${fw(sol.nB, D)}. Now ${op === "+" ? "add them" : "take them away"}: how many pieces ${opVerb(sol)}?`,
        });
      return wrong(s, `Not quite. Each ${pieceName(d)} is now ${D / d} pieces. Count the strawberry pieces!`, { kind: "row" });
    case "total": {
      if (value !== sol.total) {
        const [x, y] = sol.sameDenominator ? [a, c] : [sol.nA, sol.nB];
        return wrong(s, `Not quite. What is ${x} ${op === "+" ? "+" : "−"} ${y}?`);
      }
      const next = { ...s, total: value };
      if (sol.mixed.whole)
        return correct(next, {
          ask: "whole",
          message: `Yes, ${value} pieces! That's more than a whole tray of ${D}. How many whole trays can we fill?`,
        });
      return askSimplest(next, `Yes! That's ${fw(value, D)}.`);
    }
    case "whole":
      if (value === 1) {
        if (sol.mixed.n === 0) return finish({ ...s, whole: 1, rest: 0 });
        return correct(s, { whole: 1, ask: "rest", message: "Yes, 1 whole tray! How many pieces are in the second tray?" });
      }
      return wrong(s, `A whole tray holds ${D} pieces, and we have ${sol.total}. How many full trays is that?`);
    case "rest":
      if (value === sol.mixed.n) return askSimplest({ ...s, rest: value }, `Yes! 1 whole and ${fw(value, D)}.`);
      return wrong(s, `Not quite. One tray takes ${D} pieces. What is ${sol.total} − ${D}?`);
    case "glue": {
      const { n, d: den } = currentPart(s);
      if (canGlue(n, den, value))
        return correct(s, {
          glues: [...s.glues, { k: value, n: null, d: null }],
          ask: "glueN",
          message: `Glued in groups of ${value}! How many big pieces have topping now?`,
        });
      return wrong(s, `Groups of ${value} don't work. Look at the tray 👆 Try another number.`, { kind: "glue", k: value });
    }
    case "glueN":
    case "glueD": {
      const glues = [...s.glues];
      const g = { ...glues[glues.length - 1] };
      const before = currentPart(s);
      if (s.ask === "glueN") {
        if (value !== before.n / g.k) return wrong(s, `Not quite. Each big piece is ${g.k} small ones. What is ${before.n} ÷ ${g.k}?`);
        g.n = value;
        glues[glues.length - 1] = g;
        return correct(s, { glues, ask: "glueD", message: "Yes! And how many big pieces would fill the whole tray?" });
      }
      if (value !== before.d / g.k) return wrong(s, `Not quite. The tray had ${before.d} pieces. What is ${before.d} ÷ ${g.k}?`);
      g.d = value;
      glues[glues.length - 1] = g;
      const next = { ...s, glues };
      return askSimplest(next, `Yes! ${fw(before.n, before.d)} = ${fw(g.n!, value)}.`);
    }
    default:
      return s;
  }
}

/** The answer to "Is it as simple as it gets?" */
export function answerSimplest(s: PracticeState, simplest: boolean): PracticeState {
  const { n, d } = currentPart(s);
  const really = gcd(n, d) === 1;
  if (simplest && really) return finish(s);
  if (!simplest && !really)
    return correct(s, { ask: "glue", message: `Let's glue! How many pieces should go in each group?` });
  if (simplest)
    return wrong(s, `Look again! ${n} and ${d} can both be split into equal groups, so we can glue some pieces together.`);
  return wrong(s, `It's already as simple as it gets: no number (except 1) goes into both ${n} and ${d}.`);
}

/** A tip for the current step (shown when the student asks, or after two wrong answers). */
export function hintFor(s: PracticeState): string {
  const sol = s.solution;
  const { a, b, c, d, op } = sol.problem;
  const sign = op === "+" ? "+" : "−";
  const { n, d: den } = currentPart(s);
  const g = s.glues.at(-1);
  switch (s.ask) {
    case "den":
      return `Tray 1 is cut into ${b} columns, tray 2 into ${d} rows. Cut both ways: ${b} × ${d} = ? (Or any smaller number that ${b} and ${d} both go into!)`;
    case "nA": {
      const per = sol.denominator / b;
      return `Each ${pieceName(b)} is now ${per} pieces. ${a} × ${per} = ?`;
    }
    case "nB": {
      const per = sol.denominator / d;
      return `Each ${pieceName(d)} is now ${per} pieces. ${c} × ${per} = ?`;
    }
    case "total":
      return sol.sameDenominator ? `${a} ${sign} ${c} = ?` : `${sol.nA} ${sign} ${sol.nB} = ?`;
    case "whole":
      return `A whole tray holds ${sol.denominator} pieces. Do ${sol.total} pieces fill one tray? Two?`;
    case "rest":
      return `${sol.total} − ${sol.denominator} = ?`;
    case "simplest":
      return `Is there a number (not 1) in both the ${n} and the ${den} times tables?`;
    case "glue":
      return `Numbers that go into ${n}: ${factorsOf(n).join(", ")}. Which of them also go into ${den}?`;
    case "glueN":
      return g ? `${n} ÷ ${g.k} = ?` : "";
    case "glueD":
      return g ? `${den} ÷ ${g.k} = ?` : "";
    default:
      return "";
  }
}

/** The written working so far, and where the answer box goes. */
export function practiceBoard(s: PracticeState): { lines: BoardLine[]; active: SlotPath | null } {
  const sol = s.solution;
  const { a, b, c, d, op } = sol.problem;
  const D = sol.denominator;
  const lines: BoardLine[] = [{ terms: [{ n: a, d: b }, { n: c, d }], op }];
  let active: SlotPath | null = null;
  const at = (part: SlotPath["part"], term = 0): SlotPath => ({ line: lines.length - 1, term, part });

  if (!sol.sameDenominator) {
    lines.push({ terms: [{ n: s.nA, d: s.den }, { n: s.nB, d: s.den }], op });
    if (s.ask === "den") active = at("d");
    if (s.ask === "nA") active = at("n", 0);
    if (s.ask === "nB") active = at("n", 1);
  }
  if (sol.sameDenominator || s.nB !== null) {
    lines.push({ terms: [{ n: s.total, d: D }] });
    if (s.ask === "total") active = at("n");
  }
  if (sol.mixed.whole && s.total !== null) {
    lines.push({ terms: [{ whole: s.whole, n: s.rest, d: sol.mixed.n ? D : null }] });
    if (s.ask === "whole") active = at("whole");
    if (s.ask === "rest") active = at("n");
  }
  for (const g of s.glues) {
    lines.push({ terms: [{ whole: sol.mixed.whole ? 1 : undefined, n: g.n, d: g.d }] });
    if (g === s.glues.at(-1)) {
      if (s.ask === "glueN") active = at("n");
      if (s.ask === "glueD") active = at("d");
    }
  }
  return { lines, active };
}
