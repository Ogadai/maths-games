import type { ReactNode } from "react";
import type { BusStopSolution } from "@/lib/maths/busStop";
import { PLACE_COLOURS, type BlockKind } from "@/lib/maths/busStopScene";

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
  /** Colour bar under each digit, matching the visualiser's block colours. */
  placeColours?: boolean;
}

const SIZES = {
  md: {
    cellW: "w-10 sm:w-12",
    answerH: "h-12 sm:h-16",
    shelterH: "h-16 sm:h-20",
    digit: "text-3xl sm:text-4xl",
    carry: "text-base",
    r: "text-2xl",
  },
  lg: {
    cellW: "w-11 sm:w-14 md:w-16",
    answerH: "h-12 sm:h-14 md:h-16",
    shelterH: "h-14 sm:h-16 md:h-20",
    digit: "text-4xl sm:text-5xl md:text-6xl",
    carry: "text-base sm:text-xl md:text-2xl",
    r: "text-2xl sm:text-3xl md:text-4xl",
  },
};

/** Classes for an input placed in the board's active cell, sized to fit it. */
export const BOARD_INPUT_CLASSES = {
  digit: "w-10 h-11 text-3xl sm:w-12 sm:h-13 sm:text-4xl md:w-14 md:h-15 md:text-5xl",
  carry: "w-8 h-8 text-lg sm:w-9 sm:h-9 sm:text-xl -mt-0.5",
};

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
  placeColours = false,
}: Props) {
  const digits = solution.steps.map((s) => s.digit);
  const sz = SIZES[size];
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
        <div className={`${sz.cellW} shrink-0`} />
        {digits.map((_, i) => (
          <div key={i} className={`${sz.cellW} ${sz.answerH} flex items-end justify-center`}>
            {isActive("quotient", i) ? (
              input
            ) : quotient[i] != null ? (
              <span
                className={`${sz.digit} text-grape animate-pop ${
                  quotient[i] === 0 && i === 0 ? "opacity-40" : ""
                }`}
              >
                {quotient[i]}
              </span>
            ) : null}
          </div>
        ))}
        {remainder !== undefined && (
          <div className={`ml-2 ${sz.answerH} flex items-end gap-1`}>
            <span className={`${sz.r} text-coral`}>r</span>
            {isActive("remainder", 0) ? (
              input
            ) : remainder != null ? (
              <span className={`${sz.digit} text-coral animate-pop`}>{remainder}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Divisor + shelter */}
      <div className="flex">
        <div className={`${sz.cellW} shrink-0 flex items-center justify-center ${sz.digit} text-mint-dark`}>
          {solution.divisor}
        </div>
        <div className="flex border-l-[6px] border-t-[6px] border-ink rounded-tl-xl">
          {digits.map((digit, i) => {
            const focused = focusIndex === i;
            return (
              <div
                key={i}
                className={`relative ${sz.cellW} ${sz.shelterH} flex items-center justify-center transition-colors ${
                  focused ? "bg-sunny/50 rounded-xl" : ""
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 sm:left-1 ${sz.carry} text-coral`}>
                  {isActive("carry", i) ? input : carries[i] != null ? (
                    <span className="animate-pop inline-block">{carries[i]}</span>
                  ) : null}
                </span>
                <span className={sz.digit}>{digit}</span>
                {placeColours && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1/2 rounded-full"
                    style={{ background: PLACE_COLOURS[solution.steps[i].placeValue as BlockKind] }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
