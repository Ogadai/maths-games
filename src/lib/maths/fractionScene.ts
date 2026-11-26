/**
 * Turns a fraction sum into "beats" for the traybake visualiser.
 *
 * Every tray is modelled as its final grid (rows × cols) from the start; only
 * the knife lines that are shown change. Tray 1 starts cut into columns
 * (its bottom number), tray 2 into rows. Cutting both trays the other way
 * gives both the same grid, so the pieces match and can be moved into the
 * answer tray. Gluing regroups pieces into bigger ones to simplify.
 *
 * Pure (no React), so the board, the words and the picture share one source
 * of truth and it is easy to test.
 */
import {
  canGlue,
  fractionWords,
  gcd,
  mixedWords,
  pieceName,
  type FractionSolution,
  type MixedFraction,
  type Op,
} from "./fractions";

export type TrayId = "A" | "B" | "R1" | "R2";
export type Topping = "caramel" | "strawberry";

export const TOPPING_COLOURS: Record<Topping, string> = {
  caramel: "#F5A800",
  strawberry: "#FF6B6B",
};

export type Beat =
  | { kind: "intro" }
  | { kind: "cut" }
  | { kind: "count" }
  | { kind: "combine" }
  | { kind: "eat" }
  | { kind: "overflow" }
  | { kind: "glue"; k: number; from: MixedFraction; to: MixedFraction }
  | { kind: "finish" };

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Layout (scene units; the SVG scales to fit)
// ---------------------------------------------------------------------------

export const TRAY_W = 130;
export const TRAY_H = 96;
const WIDTH = 380;
const TOP = 10;
const LABEL_H = 60;
const ROW2 = TOP + TRAY_H + LABEL_H;

export interface FractionLayout {
  width: number;
  height: number;
  rows: number;
  cols: number;
  trays: ({ id: TrayId } & Rect)[];
  signs: { key: string; text: string; x: number; y: number }[];
}

function makeLayout(solution: FractionSolution, overflow: boolean): FractionLayout {
  const midTop = TOP + TRAY_H / 2;
  const midBottom = ROW2 + TRAY_H / 2;
  const tray = (id: TrayId, x: number, y: number) => ({ id, x, y, w: TRAY_W, h: TRAY_H });
  const trays = [tray("A", 40, TOP), tray("B", 210, TOP)];
  const signs = [{ key: "op", text: solution.problem.op === "+" ? "+" : "−", x: 190, y: midTop }];
  if (overflow) {
    trays.push(tray("R1", 40, ROW2), tray("R2", 210, ROW2));
    signs.push({ key: "eq", text: "=", x: 20, y: midBottom }, { key: "and", text: "+", x: 190, y: midBottom });
  } else {
    trays.push(tray("R1", 125, ROW2));
    signs.push({ key: "eq", text: "=", x: 105, y: midBottom });
  }
  return {
    width: WIDTH,
    height: ROW2 + TRAY_H + LABEL_H - 6,
    rows: solution.rows,
    cols: solution.cols,
    trays,
    signs,
  };
}

function trayRect(layout: FractionLayout, id: TrayId): Rect {
  const t = layout.trays.find((tr) => tr.id === id);
  if (!t) throw new Error(`No tray ${id}`);
  return t;
}

function cellRect(layout: FractionLayout, id: TrayId, row: number, col: number): Rect {
  const t = trayRect(layout, id);
  const w = t.w / layout.cols;
  const h = t.h / layout.rows;
  return { x: t.x + col * w, y: t.y + row * h, w, h };
}

/** How big each glued piece is, in small pieces. */
interface Glue {
  cellRows: number;
  cellCols: number;
}

const UNGLUED: Glue = { cellRows: 1, cellCols: 1 };

/**
 * Where small piece number `slot` sits in an answer tray. Pieces fill big
 * (glued) pieces one at a time, and big pieces fill the tray column by column.
 */
function slotRect(layout: FractionLayout, id: TrayId, slot: number, glue: Glue): Rect {
  const { cellRows, cellCols } = glue;
  const size = cellRows * cellCols;
  const bigRows = layout.rows / cellRows;
  const big = Math.floor(slot / size);
  const sub = slot % size;
  const row = (big % bigRows) * cellRows + (sub % cellRows);
  const col = Math.floor(big / bigRows) * cellCols + Math.floor(sub / cellRows);
  return cellRect(layout, id, row, col);
}

/** The rectangle covered by big piece number `big` in a glued tray. */
function bigRect(layout: FractionLayout, id: TrayId, big: number, glue: Glue): Rect {
  const first = slotRect(layout, id, big * glue.cellRows * glue.cellCols, glue);
  return { x: first.x, y: first.y, w: first.w * glue.cellCols, h: first.h * glue.cellRows };
}

/**
 * Glue groups of k pieces into one bigger piece. k is split into k1 rows × k2
 * columns of the current pieces; k1 = gcd(k, rows) leaves a k2 that always goes
 * into the number of columns, because k goes into rows × columns.
 */
export function glueShape(layout: { rows: number; cols: number }, glue: Glue, k: number): Glue {
  const bigRows = layout.rows / glue.cellRows;
  const bigCols = layout.cols / glue.cellCols;
  const k1 = gcd(k, bigRows);
  const k2 = k / k1;
  if (bigCols % k2 !== 0) throw new Error(`Can't glue ${k} pieces in a ${bigRows}×${bigCols} grid`);
  return { cellRows: glue.cellRows * k1, cellCols: glue.cellCols * k2 };
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

export type TrayLabel = { kind: "fraction"; n: number; d: number } | { kind: "text"; text: string };

export interface ScenePiece extends Rect {
  id: string;
  topping: Topping;
  /** Drawn with its own border (it has been cut free). */
  outline: boolean;
  /** Seconds (at 1x) before this piece starts moving. */
  delay: number;
  /** Highlighted (hints and wrong answers). */
  glow: boolean;
  /** Counting number shown on the piece. */
  badge?: number;
}

export interface SceneTray extends Rect {
  id: TrayId;
  /** Knife lines shown: the tray looks cut into cols × rows pieces. */
  cols: number;
  rows: number;
  /** Glows as one whole tray. */
  whole: boolean;
  label: TrayLabel | null;
}

export interface SceneFrame {
  key: string;
  pieces: ScenePiece[];
  trays: SceneTray[];
  /** Crumbs where pieces get eaten. */
  bursts: Point[];
  /** Dashed spaces for groups that can't be finished (wrong glue size). */
  ghosts: Rect[];
  celebrate: boolean;
  /** Seconds (at 1x) for this frame's animation to finish. */
  duration: number;
}

interface PieceState extends Rect {
  id: string;
  topping: Topping;
  outline: boolean;
}

interface TrayState {
  cols: number;
  rows: number;
  whole: boolean;
  label: TrayLabel | null;
}

interface SimState {
  pieces: PieceState[];
  trays: Record<TrayId, TrayState>;
}

function cloneState(s: SimState): SimState {
  return {
    pieces: s.pieces.map((p) => ({ ...p })),
    trays: Object.fromEntries(
      Object.entries(s.trays).map(([id, t]) => [id, { ...t }]),
    ) as Record<TrayId, TrayState>,
  };
}

function render(
  layout: FractionLayout,
  state: SimState,
  extra: Partial<Omit<SceneFrame, "pieces" | "trays">> & {
    key: string;
    delays?: Map<string, number>;
    glow?: Set<string>;
    badges?: Map<string, number>;
  },
): SceneFrame {
  return {
    key: extra.key,
    pieces: state.pieces.map((p) => ({
      ...p,
      delay: extra.delays?.get(p.id) ?? 0,
      glow: extra.glow?.has(p.id) ?? false,
      badge: extra.badges?.get(p.id),
    })),
    trays: layout.trays.map((t) => ({ ...t, ...state.trays[t.id] })),
    bursts: extra.bursts ?? [],
    ghosts: extra.ghosts ?? [],
    celebrate: extra.celebrate ?? false,
    duration: extra.duration ?? 0.8,
  };
}

const frac = (n: number, d: number): TrayLabel => ({ kind: "fraction", n, d });

/** Gap between pieces moving one after another, so a big batch doesn't take forever. */
const stagger = (count: number) => (count > 0 ? Math.min(0.12, 1.6 / count) : 0);

export interface FractionScene {
  solution: FractionSolution;
  layout: FractionLayout;
  beats: Beat[];
  frames: SceneFrame[];
  /** Ids of the pieces that make up the answer, in answer-tray order. */
  answerIds: string[];
  /** Glue shape and fraction after each glue beat (index 0 = before any glue). */
  glueStates: { glue: Glue; current: MixedFraction }[];
  /** Ids of tray 1's first column and tray 2's first row, for hints. */
  firstStripA: string[];
  firstRowB: string[];
}

/**
 * Build every beat. `glues` are the group sizes used to simplify, in order
 * (Watch mode glues by the highest common factor in one go; Practice passes
 * the student's choices). Each must be valid at that point.
 */
export function buildFractionScene(solution: FractionSolution, glues: number[]): FractionScene {
  const { problem, rows, cols, denominator: D, nA, nB, total, mixed, sameDenominator } = solution;
  const overflow = mixed.whole > 0;
  const layout = makeLayout(solution, overflow);

  // Tray 1: the first `a` columns have topping. Tray 2: the first `c` rows
  // (or columns, when the pieces already match).
  const aIds: string[] = [];
  const pieces: PieceState[] = [];
  for (let col = 0; col < problem.a; col++)
    for (let row = 0; row < rows; row++) {
      const id = `A-${row}-${col}`;
      aIds.push(id);
      pieces.push({ id, topping: "caramel", outline: false, ...cellRect(layout, "A", row, col) });
    }
  const bIds: string[] = [];
  const bCells: [number, number][] = [];
  if (sameDenominator) for (let col = 0; col < problem.c; col++) bCells.push([0, col]);
  else
    for (let col = 0; col < cols; col++)
      for (let row = 0; row < problem.c; row++) bCells.push([row, col]);
  for (const [row, col] of bCells) {
    const id = `B-${row}-${col}`;
    bIds.push(id);
    pieces.push({ id, topping: "strawberry", outline: false, ...cellRect(layout, "B", row, col) });
  }

  const emptyTray = (label: TrayLabel | null = null): TrayState => ({ cols: 1, rows: 1, whole: false, label });
  let state: SimState = {
    pieces,
    trays: {
      A: { cols, rows: 1, whole: false, label: frac(problem.a, problem.b) },
      B: sameDenominator
        ? { cols, rows: 1, whole: false, label: frac(problem.c, problem.d) }
        : { cols: 1, rows, whole: false, label: frac(problem.c, problem.d) },
      R1: sameDenominator ? { ...emptyTray(), cols } : emptyTray(),
      R2: sameDenominator ? { ...emptyTray(), cols } : emptyTray(),
    },
  };

  const beats: Beat[] = [];
  const frames: SceneFrame[] = [];
  const push = (beat: Beat, frame: SceneFrame) => {
    beats.push(beat);
    frames.push(frame);
  };

  const introDelays = new Map(state.pieces.map((p, i) => [p.id, i * stagger(state.pieces.length) * 0.5]));
  push({ kind: "intro" }, render(layout, state, { key: "intro", delays: introDelays, duration: 1 }));

  if (!sameDenominator) {
    // Cut both ways: every tray now shows the full grid, and pieces are free.
    state = cloneState(state);
    for (const id of ["A", "B", "R1", "R2"] as TrayId[]) {
      state.trays[id].cols = cols;
      state.trays[id].rows = rows;
    }
    state.pieces.forEach((p) => (p.outline = true));
    push({ kind: "cut" }, render(layout, state, { key: "cut", duration: 1.4 }));

    state = cloneState(state);
    state.trays.A.label = frac(nA, D);
    state.trays.B.label = frac(nB, D);
    const badges = new Map<string, number>();
    const delays = new Map<string, number>();
    const gap = Math.min(0.1, 1.4 / Math.max(nA, nB));
    aIds.forEach((id, i) => {
      badges.set(id, i + 1);
      delays.set(id, 0.2 + i * gap);
    });
    bIds.forEach((id, i) => {
      badges.set(id, i + 1);
      delays.set(id, 0.2 + i * gap);
    });
    push(
      { kind: "count" },
      render(layout, state, { key: "count", badges, delays, duration: 0.2 + Math.max(nA, nB) * gap + 0.8 }),
    );
  }

  // Combine: tray 1's pieces go into the answer tray first, then tray 2's
  // (or, when taking away, tray 2's pieces land on top of the ones to eat).
  const answerTray = (i: number): [TrayId, number] => (i < D ? ["R1", i] : ["R2", i - D]);
  state = cloneState(state);
  const byId = (s: SimState) => new Map(s.pieces.map((p) => [p.id, p]));
  {
    const map = byId(state);
    const delays = new Map<string, number>();
    const moving = aIds.length + bIds.length;
    const gap = stagger(moving);
    aIds.forEach((id, i) => {
      const [tray, slot] = answerTray(i);
      Object.assign(map.get(id)!, slotRect(layout, tray, slot, UNGLUED), { outline: true });
      delays.set(id, 0.1 + i * gap);
    });
    bIds.forEach((id, i) => {
      const target = problem.op === "+" ? nA + i : nA - nB + i;
      const [tray, slot] = answerTray(target);
      Object.assign(map.get(id)!, slotRect(layout, tray, slot, UNGLUED), { outline: true });
      delays.set(id, 0.1 + (nA + i) * gap + (problem.op === "-" ? 0.3 : 0));
    });
    state.trays.A.label = null;
    state.trays.B.label = null;
    if (!overflow) state.trays.R1.label = problem.op === "+" ? frac(total, D) : frac(nA, D);
    push(
      { kind: "combine" },
      render(layout, state, {
        key: "combine",
        delays,
        duration: 0.1 + moving * gap + 0.9 + (problem.op === "-" ? 0.3 : 0),
      }),
    );
  }

  const answerIds = problem.op === "+" ? [...aIds, ...bIds] : aIds.slice(0, total);

  if (problem.op === "-") {
    state = cloneState(state);
    const eaten = new Set([...bIds, ...aIds.slice(total)]);
    const bursts = state.pieces
      .filter((p) => eaten.has(p.id) && p.topping === "strawberry")
      .map((p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 }));
    state.pieces = state.pieces.filter((p) => !eaten.has(p.id));
    state.trays.R1.label = frac(total, D);
    push({ kind: "eat" }, render(layout, state, { key: "eat", bursts, duration: 1.1 }));
  }

  if (overflow) {
    state = cloneState(state);
    const full = new Set(answerIds.slice(0, D));
    state.pieces.forEach((p) => {
      if (full.has(p.id)) p.outline = false;
    });
    state.trays.R1 = { cols: 1, rows: 1, whole: true, label: { kind: "text", text: "1 whole" } };
    state.trays.R2.label = mixed.n > 0 ? frac(mixed.n, D) : null;
    push({ kind: "overflow" }, render(layout, state, { key: "overflow", duration: 1.2 }));
  }

  // Glue: the fractional part's pieces regroup into bigger pieces.
  const partTray: TrayId = overflow ? "R2" : "R1";
  const partIds = overflow ? answerIds.slice(D) : answerIds;
  let glue = UNGLUED;
  let current: MixedFraction = { ...mixed };
  const glueStates = [{ glue, current }];
  glues.forEach((k, g) => {
    if (!canGlue(current.n, current.d, k)) throw new Error(`Can't glue ${current.n}/${current.d} in ${k}s`);
    const from = current;
    glue = glueShape(layout, glue, k);
    current = { whole: from.whole, n: from.n / k, d: from.d / k };
    state = cloneState(state);
    const map = byId(state);
    const delays = new Map<string, number>();
    partIds.forEach((id, i) => {
      Object.assign(map.get(id)!, slotRect(layout, partTray, i, glue), { outline: false });
      delays.set(id, 0.1 + i * stagger(partIds.length) * 0.5);
    });
    state.trays[partTray].cols = cols / glue.cellCols;
    state.trays[partTray].rows = rows / glue.cellRows;
    state.trays[partTray].label = frac(current.n, current.d);
    push(
      { kind: "glue", k, from, to: current },
      render(layout, state, { key: `glue-${g}-${k}`, delays, duration: 1.6 }),
    );
    glueStates.push({ glue, current });
  });

  push({ kind: "finish" }, render(layout, state, { key: "finish", celebrate: true, duration: 1.4 }));

  return {
    solution,
    layout,
    beats,
    frames,
    answerIds,
    glueStates,
    firstStripA: aIds.slice(0, rows),
    firstRowB: sameDenominator ? bIds.slice(0, 1) : bIds.filter((id) => id.startsWith("B-0-")),
  };
}

/** Watch mode glues by the highest common factor in one go. */
export function watchGlues(solution: FractionSolution): number[] {
  return solution.hcf > 1 ? [solution.hcf] : [];
}

export function beatIndex(scene: FractionScene, kind: Beat["kind"]): number {
  return scene.beats.findIndex((b) => b.kind === kind);
}

function lastIndexOf(scene: FractionScene, kinds: Beat["kind"][]): number {
  for (let i = scene.beats.length - 1; i >= 0; i--) if (kinds.includes(scene.beats[i].kind)) return i;
  return 0;
}

// ---------------------------------------------------------------------------
// Hints and wrong answers, shown visually
// ---------------------------------------------------------------------------

/** A beat's frame with some pieces highlighted. */
export function highlightFrame(scene: FractionScene, beat: number, ids: string[], key: string): SceneFrame {
  const glow = new Set(ids);
  const frame = scene.frames[beat];
  return {
    ...frame,
    key: `${frame.key}-${key}`,
    pieces: frame.pieces.map((p) => ({ ...p, delay: 0, badge: undefined, glow: glow.has(p.id) })),
    bursts: [],
  };
}

/**
 * What happens if the student tries to glue in groups of k when that doesn't
 * work: the leftover pieces glow and dashed spaces show the missing ones.
 */
export function badGlueFrame(
  scene: FractionScene,
  beat: number,
  k: number,
): { frame: SceneFrame; message: string } {
  const { layout, solution } = scene;
  const glueCount = scene.beats.slice(0, beat + 1).filter((b) => b.kind === "glue").length;
  const { glue, current } = scene.glueStates[glueCount];
  const overflow = solution.mixed.whole > 0;
  const partTray: TrayId = overflow ? "R2" : "R1";
  const partIds = overflow ? scene.answerIds.slice(solution.denominator) : scene.answerIds;
  const size = glue.cellRows * glue.cellCols;
  const base = scene.frames[beat];
  const { n, d } = current;
  const piece = pieceName(d);

  if (k <= 1) {
    return { frame: base, message: "A group needs at least 2 pieces to glue together!" };
  }
  if (k > n) {
    return {
      frame: highlightFrame(scene, beat, partIds, `glue-${k}`),
      message: `There are only ${n} pieces, so we can't make a group of ${k}.`,
    };
  }
  if (n % k !== 0) {
    const left = n % k;
    const glow = partIds.slice((n - left) * size);
    const ghosts: Rect[] = [];
    for (let big = n; big < Math.min(d, n + k - left); big++) ghosts.push(bigRect(layout, partTray, big, glue));
    return {
      frame: { ...highlightFrame(scene, beat, glow, `glue-${k}`), ghosts },
      message: `${n} pieces don't make groups of ${k}: ${left} ${left === 1 ? "is" : "are"} left over.`,
    };
  }
  const left = d % k;
  const ghosts: Rect[] = [];
  for (let big = d - left; big < d; big++) ghosts.push(bigRect(layout, partTray, big, glue));
  return {
    frame: { ...base, key: `${base.key}-glue-${k}`, ghosts },
    message: `The tray's ${d} ${pieceName(d, true)} don't make groups of ${k}: ${left} ${piece}${left === 1 ? " is" : "s are"} left over.`,
  };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

function problemWords({ problem }: FractionSolution): string {
  const { a, b, c, d, op } = problem;
  return `${fractionWords(a, b)} ${op === "+" ? "plus" : "take away"} ${fractionWords(c, d)}`;
}

function finishText(scene: FractionScene): string {
  const end = scene.glueStates.at(-1)!.current;
  return `So ${problemWords(scene.solution)} is ${mixedWords(end)}! 🎉`;
}

/** Divvy's explanation of a beat, for Watch mode. */
export function narrate(scene: FractionScene, index: number): string {
  const s = scene.solution;
  const { a, b, c, d, op } = s.problem;
  const D = s.denominator;
  const beat = scene.beats[index];
  switch (beat.kind) {
    case "intro":
      return s.sameDenominator
        ? `Let's work out ${problemWords(s)}. Both trays are cut into ${pieceName(b, true)}, so the pieces are the same size already!`
        : `Let's work out ${problemWords(s)}. Uh-oh: ${pieceName(b, true)} and ${pieceName(d, true)} are different sizes, so we can't ${op === "+" ? "add" : "take"} them yet!`;
    case "cut":
      return `Cut tray 1 into ${d} rows and tray 2 into ${b} columns. Now both trays have ${b} × ${d} = ${D} pieces, all the same size.`;
    case "count":
      return `Each ${pieceName(b)} is now ${d} pieces, so ${fractionWords(a, b)} = ${fractionWords(s.nA, D)}. Each ${pieceName(d)} is ${b} pieces, so ${fractionWords(c, d)} = ${fractionWords(s.nB, D)}.`;
    case "combine":
      if (op === "-") return `Start with the ${s.nA} caramel pieces and take away ${s.nB}.`;
      return s.mixed.whole
        ? `Put them together: ${s.nA} + ${s.nB} = ${s.total} pieces. That's too many for one tray!`
        : `Put them together: ${s.nA} + ${s.nB} = ${s.total} pieces. That's ${fractionWords(s.total, D)}!`;
    case "eat":
      return `Munch! ${s.nA} − ${s.nB} = ${s.total} pieces left. That's ${fractionWords(s.total, D)}.`;
    case "overflow":
      return s.mixed.n
        ? `A whole tray holds ${D} pieces. So ${s.total} pieces is 1 whole tray and ${fractionWords(s.mixed.n, D)} more.`
        : `A whole tray holds ${D} pieces, so ${s.total} pieces is exactly 1 whole!`;
    case "glue":
      return `Glue the pieces into groups of ${beat.k}: ${beat.from.n} ÷ ${beat.k} = ${beat.to.n} and ${beat.from.d} ÷ ${beat.k} = ${beat.to.d}. So ${fractionWords(beat.from.n, beat.from.d)} is the same as ${fractionWords(beat.to.n, beat.to.d)}.`;
    case "finish":
      return finishText(scene);
  }
}

/** A short caption for Practise mode that doesn't give the next answer away. */
export function practiceCaption(scene: FractionScene, index: number): string {
  const s = scene.solution;
  const beat = scene.beats[index];
  const D = s.denominator;
  switch (beat.kind) {
    case "intro":
      return s.sameDenominator
        ? `Both trays are cut into ${pieceName(s.problem.b, true)}: the pieces match!`
        : "Different sized pieces! Cut both trays both ways to make them match.";
    case "cut":
      return "Both trays are cut the same way now. Count the pieces with topping!";
    case "count":
      return `${fractionWords(s.problem.a, s.problem.b)} = ${fractionWords(s.nA, D)} and ${fractionWords(s.problem.c, s.problem.d)} = ${fractionWords(s.nB, D)}.`;
    case "combine":
      if (s.problem.op === "-") return "Some pieces are about to get eaten! How many will be left?";
      return s.mixed.whole ? "Too many pieces for one tray: they spill into a second tray!" : `${fractionWords(s.total, D)}!`;
    case "eat":
      return `Munch! ${fractionWords(s.total, D)} left.`;
    case "overflow":
      return `1 whole tray${s.mixed.n ? ` and ${fractionWords(s.mixed.n, D)}` : ""}.`;
    case "glue":
      return `Glued in groups of ${beat.k}: ${fractionWords(beat.from.n, beat.from.d)} = ${fractionWords(beat.to.n, beat.to.d)}.`;
    case "finish":
      return finishText(scene);
  }
}

// ---------------------------------------------------------------------------
// The written working
// ---------------------------------------------------------------------------

export interface BoardFrac {
  /** undefined = no whole-number part; null = an empty box. */
  whole?: number | null;
  n: number | null;
  d: number | null;
}

export interface BoardLine {
  terms: BoardFrac[];
  /** Sign between two terms. */
  op?: Op;
}

export type SlotPart = "whole" | "n" | "d";

export interface SlotPath {
  line: number;
  term: number;
  part: SlotPart;
}

/** The written working shown after a beat, for Watch mode. */
export function boardAt(scene: FractionScene, index: number): BoardLine[] {
  const s = scene.solution;
  const { a, b, c, d, op } = s.problem;
  const D = s.denominator;
  const lines: BoardLine[] = [{ terms: [{ n: a, d: b }, { n: c, d }], op }];
  for (let i = 1; i <= index; i++) {
    const beat = scene.beats[i];
    switch (beat.kind) {
      case "cut":
        lines.push({ terms: [{ n: null, d: D }, { n: null, d: D }], op });
        break;
      case "count":
        lines[lines.length - 1] = { terms: [{ n: s.nA, d: D }, { n: s.nB, d: D }], op };
        break;
      case "combine":
        lines.push({ terms: [{ n: op === "+" ? s.total : null, d: D }] });
        break;
      case "eat":
        lines[lines.length - 1] = { terms: [{ n: s.total, d: D }] };
        break;
      case "overflow":
        lines.push({ terms: [s.mixed.n ? { whole: 1, n: s.mixed.n, d: D } : { whole: 1, n: null, d: null }] });
        break;
      case "glue":
        lines.push({ terms: [{ whole: beat.to.whole || undefined, n: beat.to.n, d: beat.to.d }] });
        break;
    }
  }
  return lines;
}

export type FractionAsk =
  | "den"
  | "nA"
  | "nB"
  | "total"
  | "whole"
  | "rest"
  | "simplest"
  | "glue"
  | "glueN"
  | "glueD"
  | "done";

/**
 * In Practise mode the picture runs one step behind the student: it shows
 * what they have already worked out, and their next answer plays the next beat.
 */
export function practiceBeatIndex(scene: FractionScene, ask: FractionAsk): number {
  switch (ask) {
    case "den":
      return 0;
    case "nA":
    case "nB":
      return beatIndex(scene, "cut");
    case "total":
      return scene.solution.sameDenominator ? 0 : beatIndex(scene, "count");
    case "whole":
    case "rest":
      return lastIndexOf(scene, ["combine", "eat"]);
    case "simplest":
    case "glue":
    case "glueN":
    case "glueD":
      return lastIndexOf(scene, ["combine", "eat", "overflow", "glue"]);
    case "done":
      return scene.beats.length - 1;
  }
}
