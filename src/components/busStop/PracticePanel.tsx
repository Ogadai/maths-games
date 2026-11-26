"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useReducedMotion } from "motion/react";
import { BOARD_INPUT_CLASSES, BusStopBoard, type ActiveCell } from "./BusStopBoard";
import { PlaceValueVisualiser } from "./PlaceValueVisualiser";
import { Workspace } from "./Workspace";
import { SpeechBubble } from "@/components/ui/Mascot";
import { NumberPad } from "@/components/ui/NumberPad";
import { useSoundOn } from "@/components/ui/SoundToggle";
import { useCoarsePointer } from "@/lib/useMediaQuery";
import {
  playCelebrate,
  playCorrect,
  playOops,
  speak,
  stopSpeaking,
  unlockAudio,
} from "@/lib/sound";
import { solveBusStop, type BusStopSolution, type BusStopStep } from "@/lib/maths/busStop";
import {
  buildScene,
  practiceBeatIndex,
  practiceCaption,
  whatIfFrame,
  type BusStopScene,
  type PracticeAwaiting,
} from "@/lib/maths/busStopScene";
import {
  BUS_STOP_LEVELS,
  generateProblem,
  type BusStopLevel,
} from "@/lib/maths/busStopGenerator";

type Tone = "neutral" | "success" | "oops";

/** The last wrong answer, so the visualiser can show why it doesn't work. */
type WhatIf = { kind: "quotient"; value: number } | { kind: "leftover" } | null;

interface Session {
  /** Changes with every new problem. */
  id: number;
  solution: BusStopSolution;
  stepIndex: number;
  active: ActiveCell | null;
  quotient: (number | null)[];
  carries: (number | null)[];
  remainder: number | null;
  message: string;
  tone: Tone;
  wrongOnCell: number;
  hintsUsed: number;
  done: boolean;
  whatIf: WhatIf;
}

function askQuotient(step: BusStopStep, divisor: number): string {
  const extra = step.working < divisor ? " (If it doesn't fit, write 0!)" : "";
  return `How many ${divisor}s fit into ${step.working}?${extra}`;
}

let nextId = 1;

function newSession(level: BusStopLevel): Session {
  const { dividend, divisor } = generateProblem(level);
  const solution = solveBusStop(dividend, divisor);
  const n = solution.steps.length;
  return {
    id: nextId++,
    solution,
    stepIndex: 0,
    active: { kind: "quotient", index: 0 },
    quotient: Array(n).fill(null),
    carries: Array(n).fill(null),
    remainder: null,
    message: `Let's go! ${askQuotient(solution.steps[0], divisor)}`,
    tone: "neutral",
    wrongOnCell: 0,
    hintsUsed: 0,
    done: false,
    whatIf: null,
  };
}

/** Work out what happens after a (possibly wrong) answer. Pure, so it's easy to follow. */
function applyAnswer(s: Session, value: number): Session {
  const { solution } = s;
  const d = solution.divisor;
  const step = solution.steps[s.stepIndex];
  const isLast = s.stepIndex === solution.steps.length - 1;
  const kind = s.active?.kind;
  const correct = { tone: "success" as const, wrongOnCell: 0, whatIf: null };

  if (kind === "quotient") {
    if (value !== step.quotientDigit) {
      let message: string;
      if (value * d > step.working) {
        message = `Too big! ${d} × ${value} = ${value * d}, which is more than ${step.working}.`;
      } else {
        message = `So close, but more ${d}s fit! ${d} × ${value + 1} = ${(value + 1) * d} still fits into ${step.working}.`;
      }
      return {
        ...s,
        message,
        tone: "oops",
        wrongOnCell: s.wrongOnCell + 1,
        whatIf: { kind: "quotient", value },
      };
    }
    const quotient = [...s.quotient];
    quotient[s.stepIndex] = value;
    const product = d * value;
    if (step.remainderOut > 0 && !isLast) {
      return {
        ...s,
        ...correct,
        quotient,
        active: { kind: "carry", index: s.stepIndex + 1 },
        message: `Yes! ${d} × ${value} = ${product}. How many are left over from ${step.working}?`,
      };
    }
    if (step.remainderOut > 0 && isLast) {
      return {
        ...s,
        ...correct,
        quotient,
        active: { kind: "remainder", index: 0 },
        message: `Yes! ${d} × ${value} = ${product}. What's left over at the very end?`,
      };
    }
    if (isLast) return finish({ ...s, quotient });
    const next = solution.steps[s.stepIndex + 1];
    return {
      ...s,
      ...correct,
      quotient,
      stepIndex: s.stepIndex + 1,
      active: { kind: "quotient", index: s.stepIndex + 1 },
      message: `Spot on, nothing left over! Next: ${askQuotient(next, d)}`,
    };
  }

  // Carry or final remainder: both are the leftover from this step.
  if (value !== step.remainderOut) {
    const product = d * step.quotientDigit;
    return {
      ...s,
      message: `Not quite. ${d} × ${step.quotientDigit} = ${product}. What is ${step.working} − ${product}?`,
      tone: "oops",
      wrongOnCell: s.wrongOnCell + 1,
      whatIf: { kind: "leftover" },
    };
  }

  if (kind === "remainder") return finish({ ...s, remainder: value });

  const carries = [...s.carries];
  carries[s.stepIndex + 1] = value;
  const next = solution.steps[s.stepIndex + 1];
  return {
    ...s,
    ...correct,
    carries,
    stepIndex: s.stepIndex + 1,
    active: { kind: "quotient", index: s.stepIndex + 1 },
    message: `Great! Carry the ${value} over to make ${next.working}. ${askQuotient(next, d)}`,
  };
}

function finish(s: Session): Session {
  const { dividend, divisor, quotient, remainder } = s.solution;
  const r = remainder > 0 ? ` remainder ${remainder}` : "";
  return {
    ...s,
    active: null,
    done: true,
    tone: "success",
    whatIf: null,
    message: `🎉 You did it! ${dividend} ÷ ${divisor} = ${quotient}${r}`,
  };
}

function awaiting(s: Session): PracticeAwaiting {
  if (s.done || !s.active) return "done";
  return s.active.kind;
}

async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, disableForReducedMotion: true });
}

/**
 * Move the shown beat towards the target one beat at a time, letting each
 * beat's animation finish first (one answer can complete two beats at once).
 */
function useChasedBeat(scene: BusStopScene, target: number): number {
  const [shown, setShown] = useState(target);
  const changedAt = useRef(0);
  useEffect(() => {
    changedAt.current = performance.now();
  }, [shown]);
  useEffect(() => {
    if (shown === target) return;
    const step = target > shown ? 1 : -1;
    const busyFor = scene.frames[shown].duration * 1000 + 200 - (performance.now() - changedAt.current);
    const id = setTimeout(() => setShown((s) => s + step), Math.max(0, busyFor));
    return () => clearTimeout(id);
  }, [shown, target, scene]);
  return shown;
}

export function PracticePanel() {
  const [level, setLevel] = useState<BusStopLevel | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [soundOn] = useSoundOn();
  const touch = useCoarsePointer();
  const reduceMotion = useReducedMotion();

  // Don't let Divvy keep talking after the player leaves the page.
  useEffect(() => stopSpeaking, []);

  // Bring the whole workspace (visualiser + board) into view for each new problem.
  const problemId = session?.id;
  useEffect(() => {
    const el = workspaceRef.current;
    if (!problemId || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight + 2) {
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }, [problemId, reduceMotion]);

  const start = (lvl: BusStopLevel) => {
    const fresh = newSession(lvl);
    setLevel(lvl);
    setSession(fresh);
    setInput("");
    setShowTable(false);
    if (soundOn) {
      // This click is the user action browsers need before they'll play audio.
      unlockAudio();
      speak(fresh.message);
    }
  };

  const submit = (raw: string) => {
    if (!session || raw === "") return;
    const next = applyAnswer(session, Number(raw));
    if (next.tone === "oops") {
      setShakeKey((k) => k + 1);
      if (next.wrongOnCell >= 2 && !showTable) {
        setShowTable(true);
        next.hintsUsed += 1;
      }
    }
    if (next.done) void celebrate();
    if (soundOn) {
      if (next.tone === "oops") playOops();
      else if (next.done) playCelebrate();
      else playCorrect();
      speak(next.message);
    }
    setSession(next);
    setInput("");
    // Keep the active answer box focused as it moves (keyboard users, tablets).
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 2);
    setInput(clean);
    if (!session?.active) return;
    // Remainders below 10 and quotient digits are a single digit, so check straight away.
    const singleDigit = session.active.kind === "quotient" || session.solution.divisor <= 10;
    if (singleDigit && clean.length === 1) submit(clean);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const toggleHint = () => {
    if (!session) return;
    if (!showTable) setSession({ ...session, hintsUsed: session.hintsUsed + 1 });
    setShowTable((v) => !v);
  };

  if (!session || level === null) {
    return (
      <fieldset className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        <legend className="sr-only">Choose a level to start</legend>
        {BUS_STOP_LEVELS.map((l) => (
          <button
            key={l.level}
            type="button"
            aria-pressed={false}
            onClick={() => start(l.level)}
            className="rounded-2xl border-4 border-ink/20 bg-cloud px-4 py-2 text-left transition hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
          >
            <span className="font-display text-lg font-semibold">
              {l.emoji} {l.name}
            </span>
            <span className="block text-sm text-ink-soft">{l.description}</span>
          </button>
        ))}
      </fieldset>
    );
  }

  const levelChips = (
    <fieldset className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full">
      <legend className="sr-only">Level</legend>
      {BUS_STOP_LEVELS.map((l) => {
        const selected = l.level === level;
        return (
          <button
            key={l.level}
            type="button"
            aria-pressed={selected}
            title={l.description}
            onClick={() => start(l.level)}
            className={`min-h-11 rounded-2xl border-4 px-1 py-1 font-display text-sm sm:text-lg font-semibold leading-tight flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 focus-visible:outline-4 focus-visible:outline-grape ${
              selected
                ? "border-grape bg-grape text-white shadow-[0_3px_0_var(--color-grape-dark)]"
                : "border-ink/15 bg-cloud hover:border-grape"
            }`}
          >
            <span aria-hidden="true">{l.emoji}</span>
            <span>{l.name}</span>
          </button>
        );
      })}
    </fieldset>
  );

  const kind = session.active?.kind;
  const inputEl = (
    <span key={shakeKey} className={`inline-block ${shakeKey ? "animate-wiggle" : ""}`}>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        inputMode={touch ? "none" : "numeric"}
        autoComplete="off"
        aria-label={
          kind === "quotient"
            ? "Answer digit"
            : kind === "carry"
              ? "Number carried over"
              : "Final remainder"
        }
        value={input}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-xl border-4 border-dashed border-grape bg-cloud text-center font-display text-grape outline-none focus:border-solid focus:ring-4 focus:ring-sunny ${
          kind === "carry" ? BOARD_INPUT_CLASSES.carry : BOARD_INPUT_CLASSES.digit
        }`}
      />
    </span>
  );

  return (
    <PracticeWorkspace
      key={session.id}
      workspaceRef={workspaceRef}
      session={session}
      top={levelChips}
      side={
        <>
          <SpeechBubble compact tone={session.tone}>
            {session.message}
          </SpeechBubble>

          <form
            onSubmit={onSubmit}
            className="rounded-3xl border-4 border-ink bg-cloud p-2 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 shadow-[0_6px_0_var(--color-ink)]"
          >
            <div className="max-w-full overflow-x-auto">
              <BusStopBoard
                solution={session.solution}
                quotient={session.quotient}
                carries={session.carries}
                remainder={
                  session.solution.remainder > 0 && (kind === "remainder" || session.done)
                    ? session.remainder
                    : undefined
                }
                active={session.active}
                focusIndex={session.done ? null : session.stepIndex}
                input={inputEl}
                placeColours
              />
            </div>

            {showTable && !session.done && (
              <div className="w-full">
                <p className="sr-only">The {session.solution.divisor} times table</p>
                <ul className="grid grid-cols-5 gap-1 text-center">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <li
                      key={n}
                      className="rounded-lg bg-sky px-0.5 py-0.5 font-display text-xs sm:text-sm md:text-base whitespace-nowrap"
                    >
                      {session.solution.divisor}×{n}={session.solution.divisor * n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {session.done ? (
              <button
                type="button"
                autoFocus
                onClick={() => start(level)}
                className="rounded-2xl bg-coral px-8 py-3 font-display text-2xl font-semibold text-white shadow-[0_6px_0_#c94848] animate-pop hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#c94848] focus-visible:outline-4 focus-visible:outline-grape"
              >
                Next problem ➜
              </button>
            ) : touch ? (
              <NumberPad
                onDigit={(d) => onChange(input + d)}
                onBackspace={() => setInput((v) => v.slice(0, -1))}
                onCheck={() => submit(input)}
                onHint={toggleHint}
                hintShown={showTable}
                canCheck={input !== ""}
              />
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="submit"
                  disabled={input === ""}
                  className="rounded-2xl bg-mint px-6 py-2 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-mint-dark)] disabled:opacity-40 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
                >
                  Check ✔
                </button>
                <button
                  type="button"
                  onClick={toggleHint}
                  className="rounded-2xl border-4 border-sunny-dark bg-sunny px-6 py-1.5 font-display text-xl font-semibold focus-visible:outline-4 focus-visible:outline-grape"
                >
                  {showTable ? "Hide hint" : "Hint 💡"}
                </button>
              </div>
            )}
          </form>
        </>
      }
    />
  );
}

/**
 * The workspace for one problem. Keyed by problem, so the visualiser starts
 * fresh (blocks popping in at the stop) every time.
 */
function PracticeWorkspace({
  workspaceRef,
  session,
  top,
  side,
}: {
  workspaceRef: React.Ref<HTMLDivElement>;
  session: Session;
  top: React.ReactNode;
  side: React.ReactNode;
}) {
  const scene = useMemo(() => buildScene(session.solution), [session.solution]);
  const target = practiceBeatIndex(scene, session.stepIndex, awaiting(session));
  const shown = useChasedBeat(scene, target);
  const caughtUp = shown === target;
  const { whatIf } = session;
  const last = scene.beats.length - 1;

  let frame = scene.frames[shown];
  let caption: { text: string; tone: Tone } = {
    text: practiceCaption(scene, shown),
    tone: shown === last ? "success" : "neutral",
  };
  if (caughtUp && whatIf?.kind === "quotient") {
    const shownWrong = whatIfFrame(scene, session.stepIndex, whatIf.value);
    frame = shownWrong.frame;
    caption = { text: shownWrong.message, tone: "oops" };
  } else if (caughtUp && whatIf?.kind === "leftover") {
    caption = {
      text: `Count the ${scene.layout.kinds[session.stepIndex]} still waiting at the stop 👆`,
      tone: "oops",
    };
  }

  return (
    <Workspace
      ref={workspaceRef}
      top={top}
      caption={caption}
      visual={<PlaceValueVisualiser scene={scene} frame={frame} label={caption.text} />}
      side={side}
    />
  );
}
