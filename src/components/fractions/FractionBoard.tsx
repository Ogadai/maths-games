import type { ReactNode } from "react";
import type { FractionProblem } from "@/lib/maths/fractions";
import type { BoardFrac, BoardLine, SlotPart, SlotPath } from "@/lib/maths/fractionScene";

interface Props {
  lines: BoardLine[];
  /** What the sum is, for screen readers. */
  label: string;
  /** The slot the student is filling in. */
  active?: SlotPath | null;
  /** Rendered in place of the active slot (an input). */
  input?: ReactNode;
}

/** Classes for an input placed in the board's active slot, sized to fit it. */
export const FRACTION_INPUT_CLASSES = "w-12 h-10 text-2xl sm:w-14 sm:h-11 sm:text-3xl";

const same = (a: SlotPath | null | undefined, line: number, term: number, part: SlotPart) =>
  !!a && a.line === line && a.term === term && a.part === part;

/** "3/4 + 1/2" */
export function problemLabel({ a, b, c, d, op }: FractionProblem): string {
  return `Working out ${a}/${b} ${op === "+" ? "+" : "−"} ${c}/${d}`;
}

/**
 * The written working, one step after another. Steps wrap onto new rows
 * only when they run out of room, so a long sum stays short enough to sit
 * beside the trays.
 */
export function FractionBoard({ lines, label, active, input }: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-2 font-display font-semibold select-none"
      role="group"
      aria-label={label}
    >
      {lines.map((line, li) => (
        <div key={li} className="flex items-center gap-1.5 sm:gap-2 animate-pop">
          {li > 0 && <span className="text-3xl">=</span>}
          {line.terms.map((term, ti) => (
            <div key={ti} className="flex items-center gap-1.5 sm:gap-2">
              {ti > 0 && line.op && <span className="text-3xl">{line.op === "+" ? "+" : "−"}</span>}
              <Fraction
                frac={term}
                slot={(part) => (same(active, li, ti, part) ? input : undefined)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Fraction({ frac, slot }: { frac: BoardFrac; slot: (part: SlotPart) => ReactNode | undefined }) {
  const showFraction = !(frac.whole !== undefined && frac.n === null && frac.d === null && !slot("n") && !slot("d"));
  return (
    <div className="flex items-center gap-1">
      {frac.whole !== undefined && <Cell value={frac.whole} input={slot("whole")} big />}
      {showFraction && (
        <div className="flex flex-col items-center">
          <Cell value={frac.n} input={slot("n")} />
          <div className="h-1 w-full min-w-10 rounded-full bg-ink my-0.5" />
          <Cell value={frac.d} input={slot("d")} />
        </div>
      )}
    </div>
  );
}

function Cell({ value, input, big = false }: { value: number | null; input?: ReactNode; big?: boolean }) {
  if (input) return <>{input}</>;
  const size = big ? "text-4xl sm:text-5xl min-w-8" : "text-2xl sm:text-3xl min-w-10";
  if (value === null)
    return <span className={`${size} h-9 sm:h-10 rounded-lg border-2 border-dashed border-ink/25`} aria-label="blank" />;
  return <span className={`${size} text-center leading-tight`}>{value}</span>;
}
