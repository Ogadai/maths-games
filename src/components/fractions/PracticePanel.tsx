"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { FRACTION_INPUT_CLASSES, FractionBoard, problemLabel } from "./FractionBoard";
import { TrayVisualiser } from "./TrayVisualiser";
import { Workspace } from "@/components/ui/Workspace";
import { SpeechBubble } from "@/components/ui/Mascot";
import { JokeCard } from "@/components/ui/JokeCard";
import { LevelCards, LevelChips } from "@/components/ui/LevelPicker";
import { NumberPad } from "@/components/ui/NumberPad";
import { useSoundOn } from "@/components/ui/SoundToggle";
import { flightPath, PointsFlyer, type Award } from "@/components/ui/PointsFlyer";
import { useCoarsePointer } from "@/lib/useMediaQuery";
import { celebrate, useChasedBeat } from "@/lib/usePractice";
import { useRewards } from "@/lib/rewards/store";
import { playCelebrate, playCorrect, playOops, speak, stopSpeaking, unlockAudio } from "@/lib/sound";
import { pieceName, solveFraction } from "@/lib/maths/fractions";
import {
  FRACTION_LEVELS,
  generateFractionProblem,
  type FractionLevel,
} from "@/lib/maths/fractionGenerator";
import {
  badGlueFrame,
  buildFractionScene,
  highlightFrame,
  practiceBeatIndex,
  practiceCaption,
  beatIndex,
  type SceneFrame,
} from "@/lib/maths/fractionScene";
import {
  ASK_LABELS,
  answerSimplest,
  applyAnswer,
  glueSizes,
  hintFor,
  practiceBoard,
  startPractice,
  type PracticeState,
  type Tone,
} from "@/lib/maths/fractionPractice";

interface Session extends PracticeState {
  /** Changes with every new problem. */
  id: number;
  level: FractionLevel;
  hintsUsed: number;
  /** Joke shown once the problem is solved. */
  jokeIndex: number | null;
  /** Points earned for solving it, and where the star flies. */
  award: Award | null;
}

let nextId = 1;

function newSession(level: FractionLevel): Session {
  return {
    ...startPractice(solveFraction(generateFractionProblem(level))),
    id: nextId++,
    level,
    hintsUsed: 0,
    jokeIndex: null,
    award: null,
  };
}

export function PracticePanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [soundOn] = useSoundOn();
  const touch = useCoarsePointer();
  const reduceMotion = useReducedMotion();
  const recordSolve = useRewards((s) => s.solve);
  const drawJoke = useRewards((s) => s.drawJoke);

  // Don't let Divvy keep talking after the player leaves the page.
  useEffect(() => stopSpeaking, []);

  // Bring the whole workspace (trays + board) into view for each new problem.
  const problemId = session?.id;
  useEffect(() => {
    const el = workspaceRef.current;
    if (!problemId || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight + 2) {
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }, [problemId, reduceMotion]);

  const start = (level: FractionLevel) => {
    const fresh = newSession(level);
    setSession(fresh);
    setInput("");
    setShowHint(false);
    if (soundOn) {
      // This click is the user action browsers need before they'll play audio.
      unlockAudio();
      speak(fresh.message);
    }
  };

  /** Apply a step's result: sounds, hints, scoring and the joke when it's solved. */
  const advance = (current: Session, result: PracticeState) => {
    const next: Session = { ...current, ...result };
    const askChanged = next.ask !== current.ask || next.glues.length !== current.glues.length;
    if (next.tone === "oops") {
      setShakeKey((k) => k + 1);
      if (next.wrongOnStep >= 2 && !showHint) {
        setShowHint(true);
        next.hintsUsed += 1;
      }
    } else if (askChanged) {
      setShowHint(false);
    }
    const done = next.ask === "done";
    if (done) {
      const score = recordSolve({
        topic: "fractions",
        level: next.level,
        hintsUsed: next.hintsUsed,
        mistakes: next.mistakes,
        hadRemainder: false,
      });
      // Points are shown by a star flying to the header badge, not read aloud.
      next.award = { score, ...flightPath(boardRef.current) };
      next.jokeIndex = drawJoke();
      void celebrate();
    }
    if (soundOn) {
      if (next.tone === "oops") playOops();
      else if (done) playCelebrate();
      else if (next.tone === "success") playCorrect();
      speak(next.message);
    }
    setSession(next);
    setInput("");
    // Keep the answer box focused as it moves (keyboard users, tablets).
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (raw: string) => {
    if (!session || raw === "") return;
    advance(session, applyAnswer(session, Number(raw)));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const toggleHint = () => {
    if (!session) return;
    if (!showHint) setSession({ ...session, hintsUsed: session.hintsUsed + 1 });
    setShowHint((v) => !v);
  };

  if (!session) return <LevelCards levels={FRACTION_LEVELS} onPick={start} />;

  const { ask } = session;
  const done = ask === "done";
  const yesNo = ask === "simplest";
  const typing = !done && !yesNo;
  const { lines, active } = practiceBoard(session);

  const inputEl = (
    <span key={shakeKey} className={`inline-block ${shakeKey ? "animate-wiggle" : ""}`}>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        inputMode={touch ? "none" : "numeric"}
        autoComplete="off"
        aria-label={ASK_LABELS[ask]}
        value={input}
        onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 2))}
        className={`rounded-xl border-4 border-dashed border-grape bg-cloud text-center font-display text-grape outline-none focus:border-solid focus:ring-4 focus:ring-sunny ${FRACTION_INPUT_CLASSES}`}
      />
    </span>
  );

  return (
    <PracticeWorkspace
      key={session.id}
      workspaceRef={workspaceRef}
      session={session}
      top={<LevelChips levels={FRACTION_LEVELS} selected={session.level} onPick={start} />}
      side={
        <>
          <SpeechBubble compact tone={session.tone}>
            {session.message}
            {session.award && (
              <span className="sr-only"> You earned {session.award.score.total} points.</span>
            )}
          </SpeechBubble>
          {session.award && <PointsFlyer key={session.id} award={session.award} />}

          <div
            ref={boardRef}
            className="rounded-3xl border-4 border-ink bg-cloud p-2 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 shadow-[0_6px_0_var(--color-ink)]"
          >
            <form onSubmit={onSubmit} className="flex flex-col items-center gap-2 sm:gap-3 w-full">
              <div className="w-full">
                <FractionBoard lines={lines} label={problemLabel(session.solution.problem)} active={active} input={inputEl} />
              </div>

              {ask === "glue" && (
                <label className="flex items-center gap-2 font-display text-xl font-semibold">
                  Glue in groups of {inputEl}
                </label>
              )}

              {showHint && !done && (
                <p className="w-full rounded-xl bg-sky px-3 py-1.5 text-center font-display text-base sm:text-lg">
                  💡 {hintFor(session)}
                </p>
              )}

              {done && session.jokeIndex !== null && (
                <JokeCard key={session.id} index={session.jokeIndex} soundOn={soundOn} />
              )}

              {done ? (
                <button
                  type="button"
                  autoFocus
                  onClick={() => start(session.level)}
                  className="rounded-2xl bg-coral px-8 py-3 font-display text-2xl font-semibold text-white shadow-[0_6px_0_#c94848] animate-pop hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#c94848] focus-visible:outline-4 focus-visible:outline-grape"
                >
                  Next problem ➜
                </button>
              ) : yesNo ? (
                <div className="flex flex-wrap justify-center gap-3">
                  <BigButton tone="mint" onClick={() => advance(session, answerSimplest(session, true))}>
                    Simplest! ✔
                  </BigButton>
                  <BigButton tone="grape" onClick={() => advance(session, answerSimplest(session, false))}>
                    Glue more 🧩
                  </BigButton>
                  <HintButton shown={showHint} onClick={toggleHint} />
                </div>
              ) : touch ? (
                <NumberPad
                  onDigit={(d) => setInput((v) => (v + d).slice(0, 2))}
                  onBackspace={() => setInput((v) => v.slice(0, -1))}
                  onCheck={() => submit(input)}
                  onHint={toggleHint}
                  hintShown={showHint}
                  canCheck={input !== ""}
                />
              ) : (
                typing && (
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="submit"
                      disabled={input === ""}
                      className="rounded-2xl bg-mint px-6 py-2 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-mint-dark)] disabled:opacity-40 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
                    >
                      Check ✔
                    </button>
                    <HintButton shown={showHint} onClick={toggleHint} />
                  </div>
                )
              )}
            </form>
          </div>
        </>
      }
    />
  );
}

function BigButton({ tone, onClick, children }: { tone: "mint" | "grape"; onClick: () => void; children: ReactNode }) {
  const colours =
    tone === "mint"
      ? "bg-mint shadow-[0_4px_0_var(--color-mint-dark)]"
      : "bg-grape shadow-[0_4px_0_var(--color-grape-dark)]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-5 py-2 font-display text-xl font-semibold text-white active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-sunny ${colours}`}
    >
      {children}
    </button>
  );
}

function HintButton({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border-4 border-sunny-dark bg-sunny px-6 py-1.5 font-display text-xl font-semibold focus-visible:outline-4 focus-visible:outline-grape"
    >
      {shown ? "Hide hint" : "Hint 💡"}
    </button>
  );
}

/**
 * The trays for one problem. Keyed by problem, so the picture starts fresh
 * every time. The picture runs one step behind the student.
 */
function PracticeWorkspace({
  workspaceRef,
  session,
  top,
  side,
}: {
  workspaceRef: React.Ref<HTMLDivElement>;
  session: Session;
  top: ReactNode;
  side: ReactNode;
}) {
  const sizes = glueSizes(session).join(",");
  const scene = useMemo(
    () => buildFractionScene(session.solution, sizes ? sizes.split(",").map(Number) : []),
    [session.solution, sizes],
  );
  const target = practiceBeatIndex(scene, session.ask);
  const shown = useChasedBeat(scene, target);
  const caughtUp = shown === target;
  const { whatIf, ask, solution } = session;
  const { b, d } = solution.problem;
  const last = scene.beats.length - 1;

  let frame: SceneFrame = scene.frames[shown];
  let caption: { text: string; tone: Tone } = {
    text: practiceCaption(scene, shown),
    tone: shown === last ? "success" : "neutral",
  };

  if (caughtUp && (ask === "simplest" || ask === "glue")) {
    caption = { text: "Can the pieces be glued into bigger, equal pieces?", tone: "neutral" };
  }
  if (caughtUp && (ask === "glueN" || ask === "glueD")) {
    // Don't give the answer away: hide the answer tray's fraction until it's counted.
    frame = {
      ...frame,
      trays: frame.trays.map((t) => (t.id.startsWith("R") && t.label?.kind === "fraction" ? { ...t, label: null } : t)),
    };
    caption = { text: `Glued in groups of ${session.glues.at(-1)?.k}. Count the big pieces!`, tone: "neutral" };
  }

  if (caughtUp && whatIf) {
    if (whatIf.kind === "cut") {
      frame = scene.frames[beatIndex(scene, "cut")];
      caption = { text: "Here are the trays cut both ways. Count the pieces in one tray 👆", tone: "oops" };
    } else if (whatIf.kind === "strip") {
      frame = highlightFrame(scene, shown, scene.firstStripA, "strip");
      caption = { text: `One ${pieceName(b)} is now ${solution.denominator / b} pieces 👆`, tone: "oops" };
    } else if (whatIf.kind === "row") {
      frame = highlightFrame(scene, shown, scene.firstRowB, "row");
      caption = { text: `One ${pieceName(d)} is now ${solution.denominator / d} pieces 👆`, tone: "oops" };
    } else {
      const bad = badGlueFrame(scene, shown, whatIf.k);
      frame = bad.frame;
      caption = { text: bad.message, tone: "oops" };
    }
  }

  return (
    <Workspace
      ref={workspaceRef}
      top={top}
      caption={caption}
      visual={<TrayVisualiser scene={scene} frame={frame} label={caption.text} />}
      side={side}
    />
  );
}
