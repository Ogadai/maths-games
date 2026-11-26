export type PlaceValue = "ten-thousands" | "thousands" | "hundreds" | "tens" | "ones";

const PLACE_NAMES: PlaceValue[] = ["ones", "tens", "hundreds", "thousands", "ten-thousands"];

export interface BusStopStep {
  /** Index of the dividend digit this step works on (0 = leftmost). */
  index: number;
  placeValue: PlaceValue;
  /** The dividend digit in this column. */
  digit: number;
  /** Remainder carried in from the previous column (0 for the first column). */
  carriedIn: number;
  /** The number actually being divided in this column: carriedIn * 10 + digit. */
  working: number;
  /** The digit written above the bus stop. */
  quotientDigit: number;
  /** What is left over (carried to the next column, or the final remainder). */
  remainderOut: number;
}

export interface BusStopSolution {
  dividend: number;
  divisor: number;
  steps: BusStopStep[];
  quotient: number;
  remainder: number;
}

/** Work through short ("bus stop") division one column at a time. */
export function solveBusStop(dividend: number, divisor: number): BusStopSolution {
  if (!Number.isInteger(dividend) || dividend < 0) {
    throw new Error(`Dividend must be a non-negative integer, got ${dividend}`);
  }
  if (!Number.isInteger(divisor) || divisor < 1) {
    throw new Error(`Divisor must be a positive integer, got ${divisor}`);
  }

  const digits = String(dividend).split("").map(Number);
  const steps: BusStopStep[] = [];
  let carry = 0;

  digits.forEach((digit, index) => {
    const working = carry * 10 + digit;
    const quotientDigit = Math.floor(working / divisor);
    const remainderOut = working % divisor;
    steps.push({
      index,
      placeValue: PLACE_NAMES[digits.length - 1 - index],
      digit,
      carriedIn: carry,
      working,
      quotientDigit,
      remainderOut,
    });
    carry = remainderOut;
  });

  return {
    dividend,
    divisor,
    steps,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

/** True if any column (other than the last) passes a remainder to the next. */
export function hasCarries(solution: BusStopSolution): boolean {
  return solution.steps.slice(0, -1).some((s) => s.remainderOut > 0);
}
