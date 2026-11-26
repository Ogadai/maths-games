"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MedalIcon } from "./MedalIcon";
import { useSoundOn } from "./SoundToggle";
import { medalById } from "@/lib/rewards/rules";
import { useRewards } from "@/lib/rewards/store";
import { playCelebrate, speakNext } from "@/lib/sound";

/** Celebrates each newly unlocked medal, one at a time. Lives in the root layout. */
export function MedalModal() {
  const medalId = useRewards((s) => s.pendingMedals[0]);
  const dismiss = useRewards((s) => s.dismissMedal);
  const medal = medalId ? medalById(medalId) : undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const [soundOn] = useSoundOn();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !medal) return;
    if (!dialog.open) dialog.showModal();
    if (soundOn) {
      playCelebrate();
      // After Divvy finishes reading out the answer.
      void speakNext(`Wow! You unlocked ${medal.name}!`);
    }
    void import("canvas-confetti").then(({ default: confetti }) =>
      confetti({
        particleCount: 90,
        spread: 100,
        startVelocity: 35,
        origin: { y: 0.4 },
        zIndex: 1000,
        colors: ["#FFC93C", "#FF6B6B", "#7B5CFF", "#2EC4B6"],
        disableForReducedMotion: true,
      }),
    );
    // Only celebrate when a new medal arrives, not when the sound setting changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medal]);

  if (!medal) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="medal-title"
      // Escape key or closing from code: move on to the next medal.
      onClose={dismiss}
      className="m-auto w-[min(92vw,420px)] rounded-3xl border-4 border-ink bg-cloud p-6 text-center text-ink shadow-[0_10px_0_var(--color-ink)] backdrop:bg-ink/60"
    >
      <motion.div
        key={medal.id}
        initial={reduceMotion ? false : { scale: 0.2, rotate: -25, y: -40, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 12 }}
        className="mx-auto w-32 h-40"
      >
        <MedalIcon tier={medal.tier} emoji={medal.emoji} className="w-full h-full drop-shadow-lg" />
      </motion.div>
      <p className="mt-2 font-display text-lg font-semibold text-grape">Medal unlocked!</p>
      <h2 id="medal-title" className="font-display text-3xl font-bold">
        {medal.name}
      </h2>
      <p className="mt-1 text-ink-soft font-semibold">{medal.description} ✔</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          autoFocus
          onClick={() => dialogRef.current?.close()}
          className="rounded-2xl bg-grape px-6 py-2 font-display text-xl font-semibold text-white shadow-[0_4px_0_var(--color-grape-dark)] active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-sunny"
        >
          Awesome!
        </button>
        <Link
          href="/trophies"
          onClick={() => dialogRef.current?.close()}
          className="rounded-2xl border-4 border-ink/15 bg-cloud px-5 py-1.5 font-display text-lg font-semibold hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
        >
          My trophies 🏆
        </Link>
      </div>
    </dialog>
  );
}
