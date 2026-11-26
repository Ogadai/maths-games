import type { ReactNode } from "react";
import type { BusStopSolution } from "@/lib/maths/busStop";

export type CellKind = "quotient" | "carry" | "remainder";

export interface ActiveCell {
  kind: CellKind;
  /** Column index. For "carry" this is the column the remainder is carried INTO. */
  index: number;
}

interface Props {
  solution: BusStopSolution;
  /** Quotient digit shown above each column (null = empty). */
  quotient: (number | null)[];
  /** Carried remainder shown in front of each column's digit (null = none). */
  carries: (number | null)[];
  /** Final remainder; undefined hides the remainder slot entirely. */
  remainder?: number | null;
  active?: ActiveCell | null;
  /** Column currently being worked on, highlighted for the student. */
  focusIndex?: number | null;
  /** Rendered in place of the active cell (an input). */
  input?: ReactNode;
  size?: "md" | "lg";
}

/** The written "bus stop": divisor outside the shelter, dividend under the roof, answer on top. */
export function BusStopBoard({
  solution,
  quotient,
  carries,
  remainder,
  active,
  focusIndex,
  input,
  size = "lg",
}: Props) {
  const digits = solution.steps.map((s) => s.digit);
  const cellW = size === "lg" ? "w-14 sm:w-20" : "w-10 sm:w-12";
  const digitText = size === "lg" ? "text-5xl sm:text-7xl" : "text-3xl sm:text-4xl";
  const isActive = (kind: CellKind, index: number) =>
    active?.kind === kind && active.index === index;

  return (
    <div
      className="inline-flex flex-col items-start font-display font-semibold select-none"
      role="group"
      aria-label={`${solution.dividend} divided by ${solution.divisor}`}
    >
      {/* Answer row (sits on the bus stop roof) */}
      <div className="flex items-end">
        <div className={`${cellW} shrink-0`} />
        {digits.map((_, i) => (
          <div key={i} className={`${cellW} h-16 sm:h-24 flex items-end justify-center`}>
            {isActive("quotient", i) ? (
              input
            ) : quotient[i] != null ? (
              <span
                className={`${digitText} text-grape animate-pop ${
                  quotient[i] === 0 && i === 0 ? "opacity-40" : ""
                }`}
              >
                {quotient[i]}
              </span>
            ) : null}
          </div>
        ))}
        {remainder !== undefined && (
          <div className="ml-2 h-16 sm:h-24 flex items-end gap-1">
            <span className={`${size === "lg" ? "text-3xl sm:text-5xl" : "text-2xl"} text-coral`}>
              r
            </span>
            {isActive("remainder", 0) ? (
              input
            ) : remainder != null ? (
              <span className={`${digitText} text-coral animate-pop`}>{remainder}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Divisor + shelter */}
      <div className="flex">
        <div className={`${cellW} shrink-0 flex items-center justify-center ${digitText} text-mint-dark`}>
          {solution.divisor}
        </div>
        <div className="flex border-l-[6px] border-t-[6px] border-ink rounded-tl-xl">
          {digits.map((digit, i) => {
            const focused = focusIndex === i;
            return (
              <div
                key={i}
                className={`relative ${cellW} h-20 sm:h-28 flex items-center justify-center transition-colors ${
                  focused ? "bg-sunny/50 rounded-xl" : ""
                }`}
              >
                <span className={`absolute top-1 left-0.5 sm:left-1 ${size === "lg" ? "text-xl sm:text-3xl" : "text-base"} text-coral`}>
                  {isActive("carry", i) ? input : carries[i] != null ? (
                    <span className="animate-pop inline-block">{carries[i]}</span>
                  ) : null}
                </span>
                <span className={digitText}>{digit}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
