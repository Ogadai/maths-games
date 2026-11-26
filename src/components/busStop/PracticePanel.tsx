"use client";

import { useRef, useState, type FormEvent } from "react";
import { BusStopBoard, type ActiveCell } from "./BusStopBoard";
import { SpeechBubble } from "@/components/ui/Mascot";
import { solveBusStop, type BusStopSolution, type BusStopStep } from "@/lib/maths/busStop";
import {
  BUS_STOP_LEVELS,
  generateProblem,
  type BusStopLevel,
} from "@/lib/maths/busStopGenerator";

type Tone = "neutral" | "success" | "oops";

interface Session {
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
}

function askQuotient(step: BusStopStep, divisor: number): string {
  const extra = step.working < divisor ? " (If it doesn't fit, write 0!)" : "";
  return `How many ${divisor}s fit into ${step.working}?${extra}`;
}

function newSession(level: BusStopLevel): Session {
  const { dividend, divisor } = generateProblem(level);
  const solution = solveBusStop(dividend, divisor);
  const n = solution.steps.length;
  return {
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
  };
}

/** Work out what happens after a (possibly wrong) answer. Pure, so it's easy to follow. */
function applyAnswer(s: Session, value: number): Session {
  const { solution } = s;
  const d = solution.divisor;
  const step = solution.steps[s.stepIndex];
  const isLast = s.stepIndex === solution.steps.length - 1;
  const kind = s.active?.kind;

  if (kind === "quotient") {
    if (value !== step.quotientDigit) {
      let message: string;
      if (value * d > step.working) {
        message = `Too big! ${d} × ${value} = ${value * d}, which is more than ${step.working}.`;
      } else {
        message = `So close, but more ${d}s fit! ${d} × ${value + 1} = ${(value + 1) * d} still fits into ${step.working}.`;
      }
      return { ...s, message, tone: "oops", wrongOnCell: s.wrongOnCell + 1 };
    }
    const quotient = [...s.quotient];
    quotient[s.stepIndex] = value;
    const product = d * value;
    if (step.remainderOut > 0 && !isLast) {
      return {
        ...s,
        quotient,
        active: { kind: "carry", index: s.stepIndex + 1 },
        message: `Yes! ${d} × ${value} = ${product}. How many are left over from ${step.working}?`,
        tone: "success",
        wrongOnCell: 0,
      };
    }
    if (step.remainderOut > 0 && isLast) {
      return {
        ...s,
        quotient,
        active: { kind: "remainder", index: 0 },
        message: `Yes! ${d} × ${value} = ${product}. What's left over at the very end?`,
        tone: "success",
        wrongOnCell: 0,
      };
    }
    if (isLast) return finish({ ...s, quotient });
    const next = solution.steps[s.stepIndex + 1];
    return {
      ...s,
      quotient,
      stepIndex: s.stepIndex + 1,
      active: { kind: "quotient", index: s.stepIndex + 1 },
      message: `Spot on, nothing left over! Next: ${askQuotient(next, d)}`,
      tone: "success",
      wrongOnCell: 0,
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
    };
  }

  if (kind === "remainder") return finish({ ...s, remainder: value });

  const carries = [...s.carries];
  carries[s.stepIndex + 1] = value;
  const next = solution.steps[s.stepIndex + 1];
  return {
    ...s,
    carries,
    stepIndex: s.stepIndex + 1,
    active: { kind: "quotient", index: s.stepIndex + 1 },
    message: `Great! Carry the ${value} over to make ${next.working}. ${askQuotient(next, d)}`,
    tone: "success",
    wrongOnCell: 0,
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
    message: `🎉 You did it! ${dividend} ÷ ${divisor} = ${quotient}${r}`,
  };
}

async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, disableForReducedMotion: true });
}

export function PracticePanel() {
  const [level, setLevel] = useState<BusStopLevel | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = (lvl: BusStopLevel) => {
    setLevel(lvl);
    setSession(newSession(lvl));
    setInput("");
    setShowTable(false);
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
    setSession(next);
    setInput("");
    // Keep the keyboard open on tablets as the active cell moves.
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

  const levelPicker = (
    <fieldset className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
      <legend className="sr-only">Choose a level to start</legend>
      {BUS_STOP_LEVELS.map((l) => {
        const selected = l.level === level;
        return (
          <button
            key={l.level}
            type="button"
            aria-pressed={selected}
            onClick={() => start(l.level)}
            className={`rounded-2xl border-4 px-4 py-2 text-left transition focus-visible:outline-4 focus-visible:outline-grape ${
              selected
                ? "border-grape bg-grape text-white shadow-[0_4px_0_var(--color-grape-dark)]"
                : "border-ink/20 bg-cloud hover:border-grape"
            }`}
          >
            <span className="font-display text-lg font-semibold">
              {l.emoji} {l.name}
            </span>
            <span className={`block text-sm ${selected ? "text-white/90" : "text-ink-soft"}`}>
              {l.description}
            </span>
          </button>
        );
      })}
    </fieldset>
  );

  if (!session || level === null) {
    return <div className="flex flex-col items-center gap-6">{levelPicker}</div>;
  }

  const kind = session.active?.kind;
  const inputEl = (
    <span key={shakeKey} className={`inline-block ${shakeKey ? "animate-wiggle" : ""}`}>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        inputMode="numeric"
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
          kind === "carry"
            ? "w-9 h-9 sm:w-11 sm:h-11 text-xl sm:text-2xl -mt-1"
            : "w-12 h-14 sm:w-16 sm:h-20 text-4xl sm:text-6xl"
        }`}
      />
    </span>
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {levelPicker}

      <div className="w-full max-w-2xl">
        <SpeechBubble tone={session.tone}>{session.message}</SpeechBubble>
      </div>

      <form
        onSubmit={onSubmit}
        className="w-full max-w-2xl rounded-3xl border-4 border-ink bg-cloud p-6 sm:p-10 flex flex-col items-center gap-6 shadow-[0_8px_0_var(--color-ink)]"
      >
        <div className="max-w-full overflow-x-auto pb-2">
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
          />
        </div>

        {!session.done ? (
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="submit"
              disabled={input === ""}
              className="rounded-2xl bg-mint px-6 py-3 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-mint-dark)] disabled:opacity-40 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
            >
              Check ✔
            </button>
            <button
              type="button"
              onClick={() => {
                if (!showTable) setSession({ ...session, hintsUsed: session.hintsUsed + 1 });
                setShowTable((v) => !v);
              }}
              className="rounded-2xl border-4 border-sunny-dark bg-sunny px-6 py-2 font-display text-xl font-semibold focus-visible:outline-4 focus-visible:outline-grape"
            >
              {showTable ? "Hide hint" : "Hint 💡"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            autoFocus
            onClick={() => start(level)}
            className="rounded-2xl bg-coral px-8 py-4 font-display text-2xl font-semibold text-white shadow-[0_6px_0_#c94848] animate-pop hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#c94848] focus-visible:outline-4 focus-visible:outline-grape"
          >
            Next problem ➜
          </button>
        )}

        {showTable && !session.done && (
          <div className="w-full">
            <p className="text-center font-semibold text-ink-soft mb-2">
              The {session.solution.divisor} times table
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <li key={n} className="rounded-xl bg-sky px-2 py-1 font-display text-lg">
                  {session.solution.divisor} × {n} = {session.solution.divisor * n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}
