import type { ReactNode, Ref } from "react";

type Tone = "neutral" | "success" | "oops";

interface Props {
  ref?: Ref<HTMLDivElement>;
  /** Full-width row above everything (level or example picker). */
  top?: ReactNode;
  /** The visualiser. It shrinks or grows to fill whatever space is left. */
  visual: ReactNode;
  /** Short caption shown over the visualiser. */
  caption?: { text: string; tone: Tone } | null;
  /** Speech bubble, board and buttons. */
  side: ReactNode;
}

const CAPTION_TONE: Record<Tone, string> = {
  neutral: "bg-cloud text-ink border-ink/15",
  success: "bg-mint/15 text-mint-dark border-mint-dark/40",
  oops: "bg-coral/10 text-ink border-coral",
};

/**
 * Sized to the screen so the visualiser and the board are always visible
 * together: stacked on phones and portrait tablets, side by side on wider
 * screens. The visualiser is an SVG that scales to fit the space left over.
 */
export function Workspace({ ref, top, visual, caption, side }: Props) {
  return (
    <div
      ref={ref}
      className="flex flex-col gap-2 sm:gap-3 py-2 h-dvh min-h-[540px] max-h-[1000px] lg:h-[min(100dvh,780px)] lg:min-h-[600px]"
    >
      {top}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1 min-h-[170px] flex flex-col rounded-3xl border-4 border-ink/10 bg-cloud/70">
          {caption && (
            <p
              className={`mx-2 mt-2 sm:mx-3 sm:mt-3 rounded-2xl border-2 px-3 py-1 text-center text-sm sm:text-base font-semibold leading-snug ${CAPTION_TONE[caption.tone]}`}
            >
              {caption.text}
            </p>
          )}
          <div className="relative flex-1 min-h-0 m-1.5 sm:m-3">{visual}</div>
        </div>
        <div className="flex flex-col gap-2 sm:gap-3 lg:w-[460px] lg:shrink-0 lg:justify-center">{side}</div>
      </div>
    </div>
  );
}
