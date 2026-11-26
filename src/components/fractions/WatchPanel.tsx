"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FractionBoard, problemLabel } from "./FractionBoard";
import { InlineFraction } from "./InlineFraction";
import { TrayVisualiser } from "./TrayVisualiser";
import { Workspace } from "@/components/ui/Workspace";
import { Chip, PlaybackControls, useBeatPlayer } from "@/components/ui/Playback";
import { SpeechBubble } from "@/components/ui/Mascot";
import { ownProblemError, solveFraction, type FractionProblem, type Op } from "@/lib/maths/fractions";
import { boardAt, buildFractionScene, narrate, watchGlues } from "@/lib/maths/fractionScene";
import { generateFractionProblem } from "@/lib/maths/fractionGenerator";

const EXAMPLES: FractionProblem[] = [
  { a: 1, b: 2, c: 1, d: 3, op: "+" },
  { a: 3, b: 4, c: 1, d: 2, op: "+" },
  { a: 2, b: 3, c: 1, d: 4, op: "-" },
];

const keyOf = (p: FractionProblem) => `${p.a}/${p.b}${p.op}${p.c}/${p.d}`;

/** Watch mode: the trays play through an example, with Divvy explaining each step. */
export function WatchPanel() {
  const [problem, setProblem] = useState<FractionProblem>(EXAMPLES[0]);
  const [ownOpen, setOwnOpen] = useState(false);

  const scene = useMemo(() => {
    const solution = solveFraction(problem);
    return buildFractionScene(solution, watchGlues(solution));
  }, [problem]);
  const player = useBeatPlayer({
    beatCount: scene.beats.length,
    duration: (b) => scene.frames[b].duration,
    narrate: (b) => narrate(scene, b),
  });
  const { beat, last, speed, narration } = player;

  const choose = (p: FractionProblem) => {
    setProblem(p);
    player.restart();
  };

  const examplePicker = (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {EXAMPLES.map((ex) => (
        <Chip key={keyOf(ex)} pressed={keyOf(ex) === keyOf(problem)} onClick={() => choose(ex)}>
          <ProblemText problem={ex} />
        </Chip>
      ))}
      <Chip
        pressed={false}
        onClick={() => choose(generateFractionProblem((2 + Math.floor(Math.random() * 3)) as 2 | 3 | 4))}
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
        <TrayVisualiser
          key={keyOf(problem)}
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
            <FractionBoard lines={boardAt(scene, beat)} label={problemLabel(problem)} />
          </div>
          <PlaybackControls player={player} />
        </>
      }
    />
  );
}

function ProblemText({ problem: p }: { problem: FractionProblem }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <InlineFraction n={p.a} d={p.b} />
      {p.op === "+" ? "+" : "−"}
      <InlineFraction n={p.c} d={p.d} />
    </span>
  );
}

function OwnProblemForm({ onSubmit }: { onSubmit: (p: FractionProblem) => void }) {
  const [values, setValues] = useState({ a: "", b: "", c: "", d: "" });
  const [op, setOp] = useState<Op>("+");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p: FractionProblem = {
      a: Number(values.a),
      b: Number(values.b),
      c: Number(values.c),
      d: Number(values.d),
      op,
    };
    const problem = ownProblemError(p);
    if (problem) return setError(problem);
    setError("");
    onSubmit(p);
  };

  const field = (name: keyof typeof values, label: string, placeholder: string) => (
    <input
      aria-label={label}
      inputMode="numeric"
      placeholder={placeholder}
      value={values[name]}
      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value.replace(/\D/g, "").slice(0, 1) }))}
      className="w-12 rounded-lg border-4 border-ink/20 bg-cloud px-1 py-0.5 text-center font-display text-xl focus:border-grape outline-none"
    />
  );
  const stacked = (top: ReactNode, bottom: ReactNode) => (
    <span className="inline-flex flex-col items-center gap-0.5">
      {top}
      <span className="h-1 w-10 rounded-full bg-ink" />
      {bottom}
    </span>
  );

  return (
    <form onSubmit={submit} className="basis-full flex flex-wrap items-center justify-center gap-2">
      {stacked(field("a", "First top number", "1"), field("b", "First bottom number", "2"))}
      <button
        type="button"
        onClick={() => setOp((o) => (o === "+" ? "-" : "+"))}
        aria-label={op === "+" ? "Plus (tap to take away)" : "Take away (tap to add)"}
        className="h-11 w-11 rounded-xl border-4 border-ink/15 bg-cloud font-display text-2xl font-semibold hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
      >
        {op === "+" ? "+" : "−"}
      </button>
      {stacked(field("c", "Second top number", "1"), field("d", "Second bottom number", "3"))}
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

