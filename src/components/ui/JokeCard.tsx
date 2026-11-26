"use client";

import { useEffect, useRef, useState } from "react";
import { JOKES } from "@/data/jokes";
import { useRewards } from "@/lib/rewards/store";
import { speak, speakNext } from "@/lib/sound";

/** With sound off, how long to wait before nudging the player to reveal the punchline. */
const QUIET_NUDGE_MS = 1500;

/**
 * A reward joke. With sound on, Divvy reads the setup once the answer (and
 * any medal) has been announced. Then the reveal button wiggles and glows,
 * and tapping it reads out the punchline.
 */
export function JokeCard({ index, soundOn }: { index: number; soundOn: boolean }) {
  const joke = JOKES[index];
  // Wait until "Medal unlocked!" pop-ups are closed: they cover the joke.
  const medalShowing = useRewards((s) => s.pendingMedals.length > 0);
  const [revealed, setRevealed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const setupRead = useRef(false);

  useEffect(() => {
    if (!joke || medalShowing || revealed || nudge) return;
    const controller = new AbortController();
    const { signal } = controller;
    if (soundOn) {
      void speakNext(joke.setup, signal).then((readInFull) => {
        if (signal.aborted) return;
        setupRead.current = readInFull;
        setNudge(true);
      });
    } else {
      const id = window.setTimeout(() => setNudge(true), QUIET_NUDGE_MS);
      signal.addEventListener("abort", () => window.clearTimeout(id));
    }
    return () => controller.abort();
  }, [joke, medalShowing, revealed, nudge, soundOn]);

  if (!joke) return null;

  const reveal = () => {
    setRevealed(true);
    if (soundOn) {
      speak(setupRead.current ? joke.punchline : `${joke.setup} ... ${joke.punchline}`);
    }
  };

  return (
    <div
      role="region"
      aria-label="Joke"
      className="w-full rounded-2xl border-4 border-bubblegum bg-bubblegum/15 px-3 py-2 text-center animate-pop"
    >
      <p className="font-semibold leading-snug">
        <span aria-hidden="true">😂 </span>
        {joke.setup}
      </p>
      <div aria-live="polite">
        {revealed ? (
          <p className="mt-1 font-display text-lg sm:text-xl font-semibold text-grape-dark animate-pop">
            {joke.punchline}
          </p>
        ) : (
          <button
            type="button"
            onClick={reveal}
            data-nudge={nudge || undefined}
            className={`mt-1.5 min-h-11 rounded-xl border-2 px-4 font-display text-base sm:text-lg font-semibold focus-visible:outline-4 focus-visible:outline-grape ${
              nudge
                ? "border-solid border-sunny-dark bg-sunny ring-4 ring-sunny/60 animate-nudge"
                : "border-dashed border-bubblegum bg-cloud hover:border-solid"
            }`}
          >
            Tap to reveal the punchline 👀
          </button>
        )}
      </div>
    </div>
  );
}
