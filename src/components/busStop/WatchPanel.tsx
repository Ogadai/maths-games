"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BusStopBoard } from "./BusStopBoard";
import { PlaceValueVisualiser } from "./PlaceValueVisualiser";
import { Workspace } from "./Workspace";
import { SpeechBubble } from "@/components/ui/Mascot";
import { useSoundOn } from "@/components/ui/SoundToggle";
import { speak, stopSpeaking, unlockAudio } from "@/lib/sound";
import { solveBusStop } from "@/lib/maths/busStop";
import { boardAt, buildScene, narrate } from "@/lib/maths/busStopScene";
import { generateProblem, type BusStopProblem } from "@/lib/maths/busStopGenerator";

const EXAMPLES: BusStopProblem[] = [
  { dividend: 852, divisor: 4 },
  { dividend: 5432, divisor: 7 },
];

const SPEEDS = [0.5, 1, 2];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Roughly how long it takes to read a caption, for when Divvy isn't talking. */
const readingMs = (text: string) => 1200 + text.split(" ").length * 330;

const same = (a: BusStopProblem, b: BusStopProblem) =>
  a.dividend === b.dividend && a.divisor === b.divisor;

/** Watch mode: the visualiser plays through an example, with Divvy explaining each step. */
export function WatchPanel() {
  const [problem, setProblem] = useState<BusStopProblem>(EXAMPLES[0]);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [ownOpen, setOwnOpen] = useState(false);
  const [soundOn] = useSoundOn();
  const speed = SPEEDS[speedIndex];

  const scene = useMemo(
    () => buildScene(solveBusStop(problem.dividend, problem.divisor)),
    [problem],
  );
  const last = scene.beats.length - 1;
  const narration = narrate(scene, beat);
  const board = boardAt(scene, beat);

  // Divvy only talks after the player has pressed something (browsers insist, and
  // it would be rude to start chatting on page load).
  const interacted = useRef(false);
  const speech = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    speech.current = interacted.current && soundOn ? speak(narration) : Promise.resolve();
  }, [narration, soundOn]);
  useEffect(() => stopSpeaking, []);

  // Autoplay: wait for the animation and Divvy's sentence, then move on.
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    const animation = (scene.frames[beat].duration * 1000) / speed;
    const reading = soundOn ? 0 : readingMs(narration) / speed;
    void Promise.all([sleep(Math.max(animation, reading)), speech.current])
      .then(() => sleep(600 / speed))
      .then(() => {
        if (cancelled) return;
        const next = Math.min(beat + 1, last);
        setBeat(next);
        if (next === last) setPlaying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playing, beat, scene, speed, soundOn, narration, last]);

  const touch = () => {
    if (!interacted.current && soundOn) unlockAudio();
    interacted.current = true;
  };

  const goTo = (b: number) => {
    touch();
    setPlaying(false);
    setBeat(Math.max(0, Math.min(last, b)));
  };

  const togglePlay = () => {
    touch();
    if (playing) {
      setPlaying(false);
      return;
    }
    if (beat === last) setBeat(0);
    setPlaying(true);
  };

  const choose = (p: BusStopProblem) => {
    touch();
    setProblem(p);
    setBeat(0);
    setPlaying(false);
  };

  const examplePicker = (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {EXAMPLES.map((ex) => (
        <Chip key={ex.dividend} pressed={same(ex, problem)} onClick={() => choose(ex)}>
          {ex.dividend} ÷ {ex.divisor}
        </Chip>
      ))}
      <Chip
        pressed={false}
        onClick={() => choose(generateProblem((2 + Math.floor(Math.random() * 3)) as 2 | 3 | 4))}
      >
        🎲 Surprise me
      </Chip>
      <Chip pressed={ownOpen} onClick={() => setOwnOpen((v) => !v)}>
        ✏️ My own
      </Chip>
      {ownOpen && (
        <OwnProblemForm
          onSubmit={(p) => {
            choose(p);
            setOwnOpen(false);
          }}
        />
      )}
    </div>
  );

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <ControlButton label="Start again" onClick={() => goTo(0)} disabled={beat === 0}>
          ⏮
        </ControlButton>
        <ControlButton label="Step back" onClick={() => goTo(beat - 1)} disabled={beat === 0}>
          ◀
        </ControlButton>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="h-12 min-w-28 rounded-2xl bg-coral px-4 font-display text-xl font-semibold text-white shadow-[0_4px_0_#c94848] active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
        >
          {playing ? "⏸ Pause" : beat === last ? "↻ Replay" : "▶ Play"}
        </button>
        <ControlButton label="Step forward" onClick={() => goTo(beat + 1)} disabled={beat === last}>
          ▶
        </ControlButton>
        <button
          type="button"
          onClick={() => setSpeedIndex((i) => (i + 1) % SPEEDS.length)}
          aria-label={`Speed ${speed} times`}
          className="h-12 min-w-14 rounded-2xl border-4 border-ink/15 bg-cloud px-2 font-display text-base font-semibold hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
        >
          {speed === 0.5 ? "🐢" : speed === 2 ? "🐇" : ""} {speed}×
        </button>
      </div>
      <div
        className="h-2 rounded-full bg-ink/10 overflow-hidden"
        role="progressbar"
        aria-label="Steps watched"
        aria-valuemin={1}
        aria-valuemax={last + 1}
        aria-valuenow={beat + 1}
      >
        <div
          className="h-full rounded-full bg-grape transition-[width] duration-500"
          style={{ width: `${(beat / last) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <Workspace
      top={examplePicker}
      visual={
        <PlaceValueVisualiser
          key={`${problem.dividend}/${problem.divisor}`}
          scene={scene}
          frame={scene.frames[beat]}
          speed={speed}
          label={narration}
        />
      }
      side={
        <>
          <SpeechBubble compact tone={beat === last ? "success" : "neutral"}>
            {narration}
          </SpeechBubble>
          <div className="rounded-3xl border-4 border-ink bg-cloud p-2 sm:p-4 flex justify-center shadow-[0_6px_0_var(--color-ink)]">
            <BusStopBoard
              solution={scene.solution}
              quotient={board.quotient}
              carries={board.carries}
              remainder={board.remainder}
              focusIndex={board.focusIndex}
              placeColours
            />
          </div>
          {controls}
        </>
      }
    />
  );
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-2xl border-4 px-3 py-1 font-display text-base sm:text-lg font-semibold focus-visible:outline-4 focus-visible:outline-grape ${
        pressed
          ? "border-grape bg-grape text-white shadow-[0_3px_0_var(--color-grape-dark)]"
          : "border-ink/15 bg-cloud hover:border-grape"
      }`}
    >
      {children}
    </button>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-12 rounded-2xl border-4 border-ink/15 bg-cloud font-display text-xl hover:border-grape disabled:opacity-35 focus-visible:outline-4 focus-visible:outline-grape"
    >
      {children}
    </button>
  );
}

function OwnProblemForm({ onSubmit }: { onSubmit: (p: BusStopProblem) => void }) {
  const [dividend, setDividend] = useState("");
  const [divisor, setDivisor] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const a = Number(dividend);
    const b = Number(divisor);
    if (!(a >= 10 && a <= 9999)) return setError("Pick a big number from 10 to 9999.");
    if (!(b >= 2 && b <= 12)) return setError("Share between 2 and 12 buses.");
    setError("");
    onSubmit({ dividend: a, divisor: b });
  };

  const field = "w-20 rounded-xl border-4 border-ink/20 bg-cloud px-2 py-1 text-center font-display text-xl focus:border-grape outline-none";
  return (
    <form onSubmit={submit} className="basis-full flex flex-wrap items-center justify-center gap-2">
      <input
        aria-label="Number to share"
        inputMode="numeric"
        placeholder="852"
        value={dividend}
        onChange={(e) => setDividend(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className={field}
      />
      <span className="font-display text-2xl">÷</span>
      <input
        aria-label="Number of buses"
        inputMode="numeric"
        placeholder="4"
        value={divisor}
        onChange={(e) => setDivisor(e.target.value.replace(/\D/g, "").slice(0, 2))}
        className={`${field} w-16`}
      />
      <button
        type="submit"
        className="min-h-11 rounded-2xl bg-mint px-4 font-display text-lg font-semibold text-white shadow-[0_3px_0_var(--color-mint-dark)] active:translate-y-0.5 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
      >
        Watch it!
      </button>
      {error && (
        <p role="alert" className="basis-full text-center font-semibold text-coral">
          {error}
        </p>
      )}
    </form>
  );
}
