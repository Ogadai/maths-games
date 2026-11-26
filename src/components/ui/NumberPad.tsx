"use client";

import type { PointerEvent, ReactNode } from "react";

interface Props {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onCheck: () => void;
  onHint: () => void;
  hintShown: boolean;
  canCheck: boolean;
}

/** Keep focus (and the highlighted answer box) in the input when a key is tapped. */
const keepFocus = (e: PointerEvent) => e.preventDefault();

function Key({
  children,
  label,
  onPress,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  label?: string;
  onPress: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={keepFocus}
      onClick={onPress}
      className={`h-11 sm:h-12 rounded-xl border-2 font-display text-2xl font-semibold shadow-[0_3px_0_var(--color-ink)] active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-4 focus-visible:outline-grape ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * A big, chunky number pad for touch screens. Tablets' and phones' own keyboards
 * cover half the screen, which would hide the visualiser and the board.
 */
export function NumberPad({ onDigit, onBackspace, onCheck, onHint, hintShown, canCheck }: Props) {
  const digit = (d: string) => (
    <Key key={d} onPress={() => onDigit(d)} className="border-ink/30 bg-cloud">
      {d}
    </Key>
  );
  return (
    <div className="grid grid-cols-7 gap-1.5 w-full max-w-md" aria-label="Number pad" role="group">
      {["1", "2", "3", "4", "5"].map(digit)}
      <Key label="Delete" onPress={onBackspace} className="border-ink/30 bg-sky text-xl">
        ⌫
      </Key>
      <Key
        label={hintShown ? "Hide hint" : "Hint"}
        onPress={onHint}
        className="border-sunny-dark bg-sunny text-xl"
      >
        💡
      </Key>
      {["6", "7", "8", "9", "0"].map(digit)}
      <Key
        label="Check"
        onPress={onCheck}
        disabled={!canCheck}
        className="col-span-2 border-mint-dark bg-mint text-white text-xl"
      >
        Check ✔
      </Key>
    </div>
  );
}
