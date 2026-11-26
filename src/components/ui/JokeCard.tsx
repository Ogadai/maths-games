"use client";

import { useState } from "react";
import { JOKES } from "@/data/jokes";
import { speak } from "@/lib/sound";

/** A reward joke: the setup first, then tap to reveal the punchline. */
export function JokeCard({ index, soundOn }: { index: number; soundOn: boolean }) {
  const joke = JOKES[index];
  const [revealed, setRevealed] = useState(false);
  if (!joke) return null;

  const reveal = () => {
    setRevealed(true);
    if (soundOn) speak(`${joke.setup} ... ${joke.punchline}`);
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
            className="mt-1.5 min-h-11 rounded-xl border-2 border-dashed border-bubblegum bg-cloud px-4 font-display text-base sm:text-lg font-semibold hover:border-solid focus-visible:outline-4 focus-visible:outline-grape"
          >
            Tap to reveal the punchline 👀
          </button>
        )}
      </div>
    </div>
  );
}
