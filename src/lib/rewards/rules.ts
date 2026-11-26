/**
 * Scoring and medal rules. Pure functions only, so they're easy to test and
 * the store just records what these decide.
 */

export type Level = 1 | 2 | 3 | 4;

/** Base points for solving one problem at each level. */
export const LEVEL_POINTS: Record<Level, number> = { 1: 10, 2: 20, 3: 30, 4: 50 };
export const NO_HINT_BONUS = 5;

/** Multiplier for the current streak (problems solved in a row with no mistakes). */
export function streakMultiplier(streak: number): number {
  if (streak >= 5) return 2;
  if (streak >= 3) return 1.5;
  return 1;
}

/** What happened while solving one problem. */
export interface SolvedProblem {
  topic: string;
  level: Level;
  hintsUsed: number;
  mistakes: number;
  /** The answer had a final remainder. */
  hadRemainder: boolean;
  /** The answer was an improper fraction, written as a mixed number. */
  hadMixedNumber?: boolean;
}

export interface TopicProgress {
  solved: number;
  noHintSolved: number;
  remainderSolved: number;
  /** Missing in progress saved before this badge existed. */
  mixedSolved?: number;
  /** Problems solved at each level. */
  byLevel: Partial<Record<Level, number>>;
}

export interface Progress {
  points: number;
  /** Problems solved in a row without a mistake. */
  streak: number;
  bestStreak: number;
  topics: Record<string, TopicProgress>;
  /** Medal ids, in the order they were earned. */
  medals: string[];
  /** Indexes into JOKES that this player has already seen (cleared once all are seen). */
  jokesSeen: number[];
}

export function emptyProgress(): Progress {
  return { points: 0, streak: 0, bestStreak: 0, topics: {}, medals: [], jokesSeen: [] };
}

export function emptyTopic(): TopicProgress {
  return { solved: 0, noHintSolved: 0, remainderSolved: 0, mixedSolved: 0, byLevel: {} };
}

export interface ScoreBreakdown {
  base: number;
  noHintBonus: number;
  multiplier: number;
  total: number;
  /** The streak after this problem. */
  streak: number;
}

/**
 * Points for one solved problem. Mistakes never cost points; they just reset
 * the streak, so a problem with a mistake earns no streak multiplier.
 */
export function scoreProblem(p: SolvedProblem, streakBefore: number): ScoreBreakdown {
  const streak = p.mistakes > 0 ? 0 : streakBefore + 1;
  const base = LEVEL_POINTS[p.level];
  const noHintBonus = p.hintsUsed === 0 ? NO_HINT_BONUS : 0;
  const multiplier = streakMultiplier(streak);
  return { base, noHintBonus, multiplier, streak, total: Math.round((base + noHintBonus) * multiplier) };
}

// ---------------------------------------------------------------------------
// Medals
// ---------------------------------------------------------------------------

export type MedalTier = "bronze" | "silver" | "gold" | "badge";

export interface Medal {
  id: string;
  /** Topic slug, or undefined for badges that count across every topic. */
  topic?: string;
  tier: MedalTier;
  name: string;
  emoji: string;
  /** How to earn it (shown on locked medals too). */
  description: string;
  earned: (progress: Progress) => boolean;
  /** How far along a counted medal is, for the "3 / 5" label. Absent for one-off medals. */
  progress?: (progress: Progress) => MedalProgress;
}

export interface MedalProgress {
  have: number;
  need: number;
}

/**
 * A medal earned by reaching a count. The counter and the unlock rule share
 * one function, so the "3 / 5" label and the unlock can never disagree.
 */
function counted(need: number, have: (p: Progress) => number): Pick<Medal, "earned" | "progress"> {
  return {
    earned: (p) => have(p) >= need,
    progress: (p) => ({ have: Math.min(have(p), need), need }),
  };
}

export const MEDAL_THRESHOLDS = { bronze: 5, silver: 15, gold: 30 } as const;

function topicMedals(topic: string, title: string): Medal[] {
  const solved = (p: Progress) => p.topics[topic]?.solved ?? 0;
  return [
    {
      id: `${topic}:bronze`,
      topic,
      tier: "bronze",
      name: `${title} Bronze`,
      emoji: "🥉",
      description: `Solve ${MEDAL_THRESHOLDS.bronze} problems`,
      ...counted(MEDAL_THRESHOLDS.bronze, solved),
    },
    {
      id: `${topic}:silver`,
      topic,
      tier: "silver",
      name: `${title} Silver`,
      emoji: "🥈",
      description: `Solve ${MEDAL_THRESHOLDS.silver} problems`,
      ...counted(MEDAL_THRESHOLDS.silver, solved),
    },
    {
      id: `${topic}:gold`,
      topic,
      tier: "gold",
      name: `${title} Gold`,
      emoji: "🥇",
      description: `Solve ${MEDAL_THRESHOLDS.gold} problems`,
      ...counted(MEDAL_THRESHOLDS.gold, solved),
    },
  ];
}

const allTopics = (p: Progress) => Object.values(p.topics);
const total = (p: Progress, field: "noHintSolved" | "remainderSolved" | "mixedSolved") =>
  allTopics(p).reduce((sum, t) => sum + (t[field] ?? 0), 0);

export const BADGES: Medal[] = [
  {
    id: "no-hint-hero",
    tier: "badge",
    name: "No-Hint Hero",
    emoji: "🦸",
    description: "Solve 10 problems without a hint",
    ...counted(10, (p) => total(p, "noHintSolved")),
  },
  {
    id: "streak-star",
    tier: "badge",
    name: "Streak Star",
    emoji: "🌟",
    description: "Solve 5 in a row with no mistakes",
    // Best streak, not the current one: that resets on any mistake and would look like lost progress.
    ...counted(5, (p) => p.bestStreak),
  },
  {
    id: "legend-cleared",
    tier: "badge",
    name: "Legend Level Cleared",
    emoji: "🐉",
    description: "Solve a Legend level problem",
    earned: (p) => allTopics(p).some((t) => (t.byLevel[4] ?? 0) > 0),
  },
  {
    id: "remainder-wrangler",
    tier: "badge",
    name: "Remainder Wrangler",
    emoji: "🤠",
    description: "Solve 5 problems that end with a remainder",
    ...counted(5, (p) => total(p, "remainderSolved")),
  },
  {
    id: "top-heavy-tamer",
    tier: "badge",
    name: "Top-Heavy Tamer",
    emoji: "🦁",
    description: "Solve 5 problems with improper fractions",
    ...counted(5, (p) => total(p, "mixedSolved")),
  },
];

export const MEDALS: Medal[] = [
  ...topicMedals("bus-stop-division", "Bus Stop"),
  ...topicMedals("fractions", "Fractions"),
  ...BADGES,
];

export function medalById(id: string): Medal | undefined {
  return MEDALS.find((m) => m.id === id);
}

/** Record a solved problem: points, streak, counts and any newly earned medals. */
export function recordSolve(
  progress: Progress,
  problem: SolvedProblem,
): { progress: Progress; score: ScoreBreakdown; newMedals: string[] } {
  const score = scoreProblem(problem, progress.streak);
  const before = progress.topics[problem.topic] ?? emptyTopic();
  const topic: TopicProgress = {
    solved: before.solved + 1,
    noHintSolved: before.noHintSolved + (problem.hintsUsed === 0 ? 1 : 0),
    remainderSolved: before.remainderSolved + (problem.hadRemainder ? 1 : 0),
    mixedSolved: (before.mixedSolved ?? 0) + (problem.hadMixedNumber ? 1 : 0),
    byLevel: { ...before.byLevel, [problem.level]: (before.byLevel[problem.level] ?? 0) + 1 },
  };
  const next: Progress = {
    ...progress,
    points: progress.points + score.total,
    streak: score.streak,
    bestStreak: Math.max(progress.bestStreak, score.streak),
    topics: { ...progress.topics, [problem.topic]: topic },
  };
  const newMedals = MEDALS.filter((m) => !next.medals.includes(m.id) && m.earned(next)).map((m) => m.id);
  next.medals = [...next.medals, ...newMedals];
  return { progress: next, score, newMedals };
}

/**
 * Choose the next joke index, never repeating one until every joke has been
 * shown. Returns the index and the updated "seen" list.
 */
export function nextJoke(seen: number[], count: number, rng: () => number = Math.random) {
  const seenSet = new Set(seen.filter((i) => i >= 0 && i < count));
  let pool = Array.from({ length: count }, (_, i) => i).filter((i) => !seenSet.has(i));
  let history = [...seenSet];
  if (pool.length === 0) {
    // Everything has been shown: start again, but avoid repeating the very last joke.
    const last = seen[seen.length - 1];
    pool = Array.from({ length: count }, (_, i) => i).filter((i) => i !== last || count === 1);
    history = [];
  }
  const index = pool[Math.floor(rng() * pool.length)];
  return { index, seen: [...history, index] };
}
