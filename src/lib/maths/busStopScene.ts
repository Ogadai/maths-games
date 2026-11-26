/**
 * Turns a bus stop division into a sequence of "beats" for the place-value
 * visualiser: the dividend's blocks wait at the stop, then each column is shared
 * between the buses, and leftovers are swapped for ten of the next block down.
 *
 * Everything here is pure (no React), so the board, the narration and the
 * animation all read from the same source of truth and it is easy to test.
 */
import type { BusStopSolution } from "./busStop";

export type BlockKind = "thousands" | "hundreds" | "tens" | "ones";

export type Beat =
  | { kind: "intro" }
  | { kind: "share"; step: number }
  | { kind: "exchange"; step: number }
  | { kind: "finish" };

export const PLACE_COLOURS: Record<BlockKind, string> = {
  thousands: "#7B5CFF",
  hundreds: "#FF6B6B",
  tens: "#2EC4B6",
  ones: "#FFC93C",
};

export const LANE_COLOURS = [
  "#7B5CFF", "#FF6B6B", "#2EC4B6", "#F5A800", "#FF5FB8", "#4DA3FF",
  "#7CC242", "#FF8A3D", "#A06CD5", "#16B3C9", "#E0507F", "#8D6E63",
];

const SINGULAR: Record<BlockKind, string> = {
  thousands: "thousand",
  hundreds: "hundred",
  tens: "ten",
  ones: "one",
};

/** "1 hundred", "12 hundreds". */
export function placeWord(kind: BlockKind, count: number): string {
  return count === 1 ? SINGULAR[kind] : kind;
}

// ---------------------------------------------------------------------------
// Geometry (scene units; the SVG scales to fit whatever space it is given)
// ---------------------------------------------------------------------------

export const BLOCK_SIZE: Record<BlockKind, { w: number; h: number }> = {
  thousands: { w: 22, h: 22 },
  hundreds: { w: 22, h: 22 },
  tens: { w: 6, h: 26 },
  ones: { w: 11, h: 11 },
};

/** How blocks are arranged at the stop. Big counts squash rows together into a pile. */
const PILE_SPEC: Record<BlockKind, { perRow: number; px: number; py: number }> = {
  thousands: { perRow: 4, px: 25, py: 24 },
  hundreds: { perRow: 4, px: 25, py: 24 },
  tens: { perRow: 10, px: 9.5, py: 28 },
  ones: { perRow: 8, px: 12.5, py: 12.5 },
};

/** Spacing of blocks along a bus. Thousands and hundreds overlap like a fanned stack. */
const LANE_PITCH: Record<BlockKind, number> = {
  thousands: 7.5,
  hundreds: 7.5,
  tens: 9,
  ones: 11,
};

export interface SceneLayout {
  width: number;
  height: number;
  columns: number;
  lanes: number;
  labelW: number;
  colW: number;
  headerH: number;
  pileTop: number;
  pileH: number;
  laneTop: number;
  laneH: number;
  laneGap: number;
  laneScale: number;
  kinds: BlockKind[];
}

const LABEL_W = 60;
const COL_W = 112;
const PAD = 6;
const HEADER_H = 22;
const PILE_H = 96;
const GAP = 12;

function makeLayout(solution: BusStopSolution): SceneLayout {
  const columns = solution.steps.length;
  const lanes = solution.divisor;
  const laneH = lanes <= 3 ? 46 : lanes <= 5 ? 40 : lanes <= 8 ? 34 : 28;
  const laneGap = lanes <= 8 ? 5 : 4;
  const laneTop = HEADER_H + PILE_H + GAP;
  return {
    width: LABEL_W + columns * COL_W + PAD,
    height: laneTop + lanes * (laneH + laneGap) - laneGap + PAD,
    columns,
    lanes,
    labelW: LABEL_W,
    colW: COL_W,
    headerH: HEADER_H,
    pileTop: HEADER_H,
    pileH: PILE_H,
    laneTop,
    laneH,
    laneGap,
    laneScale: Math.min(1, (laneH - 8) / 26),
    kinds: solution.steps.map((s) => s.placeValue as BlockKind),
  };
}

export function colX(layout: SceneLayout, col: number): number {
  return layout.labelW + col * layout.colW;
}

export function laneY(layout: SceneLayout, lane: number): number {
  return layout.laneTop + lane * (layout.laneH + layout.laneGap);
}

interface Point {
  x: number;
  y: number;
}

/** Top-left corner of every block in a pile, bottom row first. */
function pilePositions(layout: SceneLayout, col: number, count: number): Point[] {
  const kind = layout.kinds[col];
  const { w, h } = BLOCK_SIZE[kind];
  const { perRow, px, py } = PILE_SPEC[kind];
  const left = colX(layout, col) + 6;
  const innerW = layout.colW - 12;
  const bottom = layout.pileTop + layout.pileH - 6;
  const innerH = layout.pileH - 26;
  const rows = Math.ceil(count / perRow);
  const pitchY = rows > 1 ? Math.min(py, (innerH - h) / (rows - 1)) : py;
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const j = i % perRow;
    const inRow = Math.min(perRow, count - row * perRow);
    const rowW = (inRow - 1) * px + w;
    out.push({ x: left + (innerW - rowW) / 2 + j * px, y: bottom - h - row * pitchY });
  }
  return out;
}

function laneSlot(layout: SceneLayout, col: number, lane: number, slot: number): Point {
  const kind = layout.kinds[col];
  const s = layout.laneScale;
  const { h } = BLOCK_SIZE[kind];
  return {
    x: colX(layout, col) + 8 + slot * LANE_PITCH[kind] * s,
    y: laneY(layout, lane) + (layout.laneH - h * s) / 2,
  };
}

/** True when a pile is squashed so blocks overlap, so it needs a count label. */
function pileIsSquashed(kind: BlockKind, count: number, layout: SceneLayout): boolean {
  const { h } = BLOCK_SIZE[kind];
  const { perRow, py } = PILE_SPEC[kind];
  const rows = Math.ceil(count / perRow);
  return rows > 1 && (rows - 1) * py + h > layout.pileH - 26;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

export interface SceneBlock {
  id: string;
  kind: BlockKind;
  x: number;
  y: number;
  scale: number;
  /** Where the block appears from when it is first shown (exchanged blocks). */
  from?: Point;
  /** Seconds (at 1x speed) before this block starts moving. */
  delay: number;
  /** Still waiting at the stop after sharing: these are the leftovers. */
  leftover: boolean;
}

export interface SceneGhost {
  key: string;
  kind: BlockKind;
  x: number;
  y: number;
  scale: number;
}

export interface SceneFrame {
  /** Unique per frame, so one-off effects (sparkles, hops) replay when it is shown. */
  key: string;
  blocks: SceneBlock[];
  /** Empty dashed slots: blocks a bus should have got but there weren't enough. */
  ghosts: SceneGhost[];
  /** Centres of blocks that break apart with a sparkle. */
  bursts: Point[];
  /** Count labels for piles too big to count by eye. */
  badges: { col: number; count: number }[];
  /** Column being worked on, highlighted to match the board. */
  focusCol: number | null;
  /** Per-lane delay (seconds at 1x) for each bus to do a happy hop, or null. */
  hops: number[] | null;
  celebrate: boolean;
  /** Seconds (at 1x) for this frame's animation to finish. */
  duration: number;
}

interface SimState {
  /** Block ids waiting at the stop, per column, bottom of the pile first. */
  piles: string[][];
  /** Block ids on each bus, per lane then column. */
  lanes: string[][][];
}

function cloneState(s: SimState): SimState {
  return { piles: s.piles.map((p) => [...p]), lanes: s.lanes.map((l) => l.map((c) => [...c])) };
}

function render(
  layout: SceneLayout,
  state: SimState,
  extra: Partial<Omit<SceneFrame, "blocks">> & {
    key: string;
    delays?: Map<string, number>;
    from?: Map<string, Point>;
    leftoverCol?: number;
  },
): SceneFrame {
  const blocks: SceneBlock[] = [];
  const badges: SceneFrame["badges"] = [];
  state.piles.forEach((ids, col) => {
    const kind = layout.kinds[col];
    const pos = pilePositions(layout, col, ids.length);
    ids.forEach((id, i) =>
      blocks.push({
        id,
        kind,
        ...pos[i],
        scale: 1,
        from: extra.from?.get(id),
        delay: extra.delays?.get(id) ?? 0,
        leftover: extra.leftoverCol === col,
      }),
    );
    if (pileIsSquashed(kind, ids.length, layout)) badges.push({ col, count: ids.length });
  });
  state.lanes.forEach((cols, lane) =>
    cols.forEach((ids, col) =>
      ids.forEach((id, slot) =>
        blocks.push({
          id,
          kind: layout.kinds[col],
          ...laneSlot(layout, col, lane, slot),
          scale: layout.laneScale,
          delay: extra.delays?.get(id) ?? 0,
          leftover: false,
        }),
      ),
    ),
  );
  return {
    key: extra.key,
    blocks,
    badges,
    ghosts: extra.ghosts ?? [],
    bursts: extra.bursts ?? [],
    focusCol: extra.focusCol ?? null,
    hops: extra.hops ?? null,
    celebrate: extra.celebrate ?? false,
    duration: extra.duration ?? 0.6,
  };
}

interface Deal {
  delays: Map<string, number>;
  hops: number[];
  ghosts: SceneGhost[];
  duration: number;
}

/**
 * Deal `each` blocks to every bus from the top of a column's pile, one at a time
 * round the buses like dealing cards. If the pile runs out, the missing blocks
 * become ghosts.
 */
function deal(layout: SceneLayout, state: SimState, col: number, each: number): Deal {
  const N = layout.lanes;
  const pile = state.piles[col];
  const wanted = each * N;
  const available = Math.min(wanted, pile.length);
  const gap = wanted > 0 ? Math.min(0.22, 1.8 / wanted) : 0;
  const delays = new Map<string, number>();
  const hops = Array(N).fill(0);
  const ghosts: SceneGhost[] = [];
  for (let k = 0; k < wanted; k++) {
    const lane = k % N;
    const delay = 0.25 + k * gap;
    if (k < available) {
      const id = pile.pop()!;
      state.lanes[lane][col].push(id);
      delays.set(id, delay);
      hops[lane] = delay + 0.45;
    } else {
      const slot = Math.floor(k / N);
      ghosts.push({
        key: `ghost-${col}-${lane}-${slot}`,
        kind: layout.kinds[col],
        ...laneSlot(layout, col, lane, slot),
        scale: layout.laneScale,
      });
    }
  }
  return { delays, hops, ghosts, duration: wanted > 0 ? 0.25 + wanted * gap + 0.7 : 1 };
}

export interface BusStopScene {
  solution: BusStopSolution;
  layout: SceneLayout;
  beats: Beat[];
  frames: SceneFrame[];
  /** Simulation state just before each step is shared (used for "what if" frames). */
  beforeShare: SimState[];
}

export function buildScene(solution: BusStopSolution): BusStopScene {
  if (solution.steps.length > 4) throw new Error("The visualiser handles up to 4 digits");
  const layout = makeLayout(solution);
  const N = solution.divisor;
  const last = solution.steps.length - 1;

  let state: SimState = {
    piles: solution.steps.map((s, col) => Array.from({ length: s.digit }, (_, k) => `${col}:${k}`)),
    lanes: Array.from({ length: N }, () => solution.steps.map(() => [])),
  };

  const beats: Beat[] = [{ kind: "intro" }];
  const introDelays = new Map<string, number>();
  state.piles.flat().forEach((id, i) => introDelays.set(id, i * 0.04));
  const frames: SceneFrame[] = [
    render(layout, state, { key: "intro", focusCol: 0, delays: introDelays, duration: 0.8 }),
  ];
  const beforeShare: SimState[] = [];

  solution.steps.forEach((step, i) => {
    beforeShare.push(cloneState(state));
    const shared = cloneState(state);
    const d = deal(layout, shared, i, step.quotientDigit);
    beats.push({ kind: "share", step: i });
    frames.push(
      render(layout, shared, {
        key: `share-${i}`,
        focusCol: i,
        delays: d.delays,
        hops: step.quotientDigit > 0 ? d.hops : null,
        leftoverCol: shared.piles[i].length > 0 ? i : undefined,
        duration: d.duration,
      }),
    );
    state = shared;

    if (step.remainderOut > 0 && i < last) {
      const sharePos = new Map(frames.at(-1)!.blocks.map((b) => [b.id, b]));
      const exchanged = cloneState(state);
      const leftovers = exchanged.piles[i].splice(0);
      const r = leftovers.length;
      const childGap = Math.min(0.06, 1.2 / (10 * r));
      const delays = new Map<string, number>();
      const from = new Map<string, Point>();
      const bursts: Point[] = [];
      const { w, h } = BLOCK_SIZE[layout.kinds[i]];
      const child = BLOCK_SIZE[layout.kinds[i + 1]];
      leftovers.forEach((parent, p) => {
        const pos = sharePos.get(parent)!;
        const centre = { x: pos.x + w / 2, y: pos.y + h / 2 };
        bursts.push(centre);
        for (let j = 0; j < 10; j++) {
          const id = `${parent}>${j}`;
          exchanged.piles[i + 1].push(id);
          delays.set(id, 0.45 + (p * 10 + j) * childGap);
          from.set(id, { x: centre.x - child.w / 2, y: centre.y - child.h / 2 });
        }
      });
      beats.push({ kind: "exchange", step: i });
      frames.push(
        render(layout, exchanged, {
          key: `exchange-${i}`,
          focusCol: i + 1,
          delays,
          from,
          bursts,
          duration: 0.45 + 10 * r * childGap + 0.8,
        }),
      );
      state = exchanged;
    }
  });

  beats.push({ kind: "finish" });
  frames.push(
    render(layout, state, {
      key: "finish",
      focusCol: null,
      hops: Array.from({ length: N }, (_, lane) => 0.1 + lane * 0.08),
      celebrate: true,
      leftoverCol: solution.remainder > 0 ? last : undefined,
      duration: 1.4,
    }),
  );

  return { solution, layout, beats, frames, beforeShare };
}

// ---------------------------------------------------------------------------
// Wrong answers, shown visually
// ---------------------------------------------------------------------------

/**
 * What it would look like if every bus got `value` blocks at this step. Too many
 * leaves ghost slots that can't be filled; too few leaves enough blocks at the
 * stop to go round again.
 */
export function whatIfFrame(
  scene: BusStopScene,
  stepIndex: number,
  value: number,
): { frame: SceneFrame; message: string } {
  const { layout, solution } = scene;
  const step = solution.steps[stepIndex];
  const N = solution.divisor;
  const kind = layout.kinds[stepIndex];
  const state = cloneState(scene.beforeShare[stepIndex]);
  const d = deal(layout, state, stepIndex, value);
  const left = state.piles[stepIndex].length;
  const frame = render(layout, state, {
    key: `whatif-${stepIndex}-${value}`,
    focusCol: stepIndex,
    delays: d.delays,
    ghosts: d.ghosts,
    leftoverCol: left > 0 ? stepIndex : undefined,
    duration: d.duration,
  });
  const need = value * N;
  const message =
    need > step.working
      ? `${value} each won't fit! You'd need ${need} ${placeWord(kind, need)}, but there are only ${step.working}.`
      : `Each bus got ${value}, but ${left} ${placeWord(kind, left)} are still waiting. That's enough for every bus to get another!`;
  return { frame, message };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

/** Divvy's explanation of a beat, for Watch mode. */
export function narrate(scene: BusStopScene, beatIndex: number): string {
  const { solution, layout } = scene;
  const { dividend, divisor: N, steps } = solution;
  const beat = scene.beats[beatIndex];
  const buses = `${N} buses`;
  switch (beat.kind) {
    case "intro":
      return `Let's share ${dividend} between ${buses}. Every bus must get the same. We start with the biggest blocks: the ${layout.kinds[0]}.`;
    case "share": {
      const s = steps[beat.step];
      const kind = layout.kinds[beat.step];
      const isLast = beat.step === steps.length - 1;
      const what = `${s.working} ${placeWord(kind, s.working)}`;
      let text =
        s.quotientDigit === 0
          ? `Share ${what} between ${buses}? Not enough for one each, so each bus gets 0.`
          : `Share ${what} between ${buses}: each bus gets ${s.quotientDigit}. (${N} × ${s.quotientDigit} = ${N * s.quotientDigit})`;
      if (s.remainderOut === 0) text += " Nothing left over!";
      else if (isLast)
        text += ` ${s.remainderOut} left over can't be shared fairly, so that's the remainder.`;
      else if (s.quotientDigit > 0) text += ` ${s.remainderOut} left over.`;
      return text;
    }
    case "exchange": {
      const s = steps[beat.step];
      const next = steps[beat.step + 1];
      const kind = layout.kinds[beat.step];
      const nextKind = layout.kinds[beat.step + 1];
      const r = s.remainderOut;
      return `${r} ${placeWord(kind, r)} left over, so swap ${r === 1 ? "it" : "them"} for ${r * 10} ${nextKind}. Now we have ${next.working} ${placeWord(nextKind, next.working)}.`;
    }
    case "finish":
      return finishText(solution);
  }
}

function finishText({ dividend, divisor, quotient, remainder }: BusStopSolution): string {
  const r = remainder > 0 ? ` remainder ${remainder}` : "";
  return `Every bus carries ${quotient}. So ${dividend} ÷ ${divisor} = ${quotient}${r}! 🎉`;
}

/** A short caption for Practise mode that doesn't give the next answer away. */
export function practiceCaption(scene: BusStopScene, beatIndex: number): string {
  const { solution, layout } = scene;
  const { divisor: N, steps } = solution;
  const beat = scene.beats[beatIndex];
  switch (beat.kind) {
    case "intro": {
      const s = steps[0];
      return `${s.working} ${placeWord(layout.kinds[0], s.working)} at the stop. Share them between ${N} buses!`;
    }
    case "share": {
      const s = steps[beat.step];
      const kind = layout.kinds[beat.step];
      if (s.remainderOut > 0) return `Each bus gets ${s.quotientDigit}. Count the ${kind} left at the stop!`;
      const next = steps[beat.step + 1];
      if (!next) return finishText(solution);
      return `${s.quotientDigit} each, nothing left! Next, share the ${next.working} ${placeWord(layout.kinds[beat.step + 1], next.working)}.`;
    }
    case "exchange": {
      const s = steps[beat.step];
      const next = steps[beat.step + 1];
      const nextKind = layout.kinds[beat.step + 1];
      return `Swapped for ${s.remainderOut * 10} ${nextKind}: now ${next.working} ${placeWord(nextKind, next.working)} to share!`;
    }
    case "finish":
      return finishText(solution);
  }
}

// ---------------------------------------------------------------------------
// Keeping the board in sync
// ---------------------------------------------------------------------------

export interface BoardState {
  quotient: (number | null)[];
  carries: (number | null)[];
  /** undefined hides the remainder slot. */
  remainder: number | null | undefined;
  focusIndex: number | null;
}

/** What the written bus stop shows once a beat has played. */
export function boardAt(scene: BusStopScene, beatIndex: number): BoardState {
  const { solution, beats } = scene;
  const n = solution.steps.length;
  const quotient: (number | null)[] = Array(n).fill(null);
  const carries: (number | null)[] = Array(n).fill(null);
  let remainder: number | null | undefined;
  for (let b = 0; b <= beatIndex; b++) {
    const beat = beats[b];
    if (beat.kind === "share") {
      const s = solution.steps[beat.step];
      quotient[beat.step] = s.quotientDigit;
      if (beat.step === n - 1 && s.remainderOut > 0) remainder = s.remainderOut;
    } else if (beat.kind === "exchange") {
      carries[beat.step + 1] = solution.steps[beat.step].remainderOut;
    }
  }
  const beat = beats[beatIndex];
  const focusIndex =
    beat.kind === "intro" ? 0 : beat.kind === "finish" ? null : scene.frames[beatIndex].focusCol;
  return { quotient, carries, remainder, focusIndex };
}

export type PracticeAwaiting = "quotient" | "carry" | "remainder" | "done";

/**
 * In Practise mode the picture runs one step behind the student: it shows
 * everything they have already answered, and their next answer plays the next beat.
 */
export function practiceBeatIndex(
  scene: BusStopScene,
  stepIndex: number,
  awaiting: PracticeAwaiting,
): number {
  const { beats } = scene;
  if (awaiting === "done") return beats.length - 1;
  const share = beats.findIndex((b) => b.kind === "share" && b.step === stepIndex);
  return awaiting === "quotient" ? share - 1 : share;
}
