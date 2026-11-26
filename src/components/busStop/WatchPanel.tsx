"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BusStopBoard } from "./BusStopBoard";
import { PlaceValueVisualiser } from "./PlaceValueVisualiser";
import { Workspace } from "@/components/ui/Workspace";
import { Chip, PlaybackControls, useBeatPlayer } from "@/components/ui/Playback";
import { SpeechBubble } from "@/components/ui/Mascot";
import { solveBusStop } from "@/lib/maths/busStop";
import { boardAt, buildScene, narrate } from "@/lib/maths/busStopScene";
import { generateProblem, type BusStopProblem } from "@/lib/maths/busStopGenerator";

const EXAMPLES: BusStopProblem[] = [
  { dividend: 852, divisor: 4 },
  { dividend: 5432, divisor: 7 },
];

const same = (a: BusStopProblem, b: BusStopProblem) =>
  a.dividend === b.dividend && a.divisor === b.divisor;

/** Watch mode: the visualiser plays through an example, with Divvy explaining each step. */
export function WatchPanel() {
  const [problem, setProblem] = useState<BusStopProblem>(EXAMPLES[0]);
  const [ownOpen, setOwnOpen] = useState(false);

  const scene = useMemo(
    () => buildScene(solveBusStop(problem.dividend, problem.divisor)),
    [problem],
  );
  const player = useBeatPlayer({
    beatCount: scene.beats.length,
    duration: (b) => scene.frames[b].duration,
    narrate: (b) => narrate(scene, b),
  });
  const { beat, last, speed, narration } = player;
  const board = boardAt(scene, beat);

  const choose = (p: BusStopProblem) => {
    setProblem(p);
    player.restart();
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
          <PlaybackControls player={player} />
        </>
      }
    />
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
