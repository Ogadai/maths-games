"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { activeProfile, useRewards } from "@/lib/rewards/store";

/** Header badge: the active player's points (counting up as they rise) and streak. */
export function PointsBadge() {
  const points = useRewards((s) => activeProfile(s).progress.points);
  const streak = useRewards((s) => activeProfile(s).progress.streak);
  const nickname = useRewards((s) => activeProfile(s).nickname);
  const hydrated = useRewards((s) => s.hydrated);
  const reduceMotion = useReducedMotion();

  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v).toLocaleString("en-GB"));
  const shownOnce = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    // Saved points appear straight away on page load; new points count up.
    if (!shownOnce.current || reduceMotion) {
      shownOnce.current = true;
      value.jump(points);
      return;
    }
    const controls = animate(value, points, { duration: 1.2, ease: "easeOut" });
    return () => controls.stop();
  }, [points, hydrated, reduceMotion, value]);

  const who = nickname ? `${nickname}'s` : "Your";
  return (
    <Link
      href="/trophies"
      aria-label={`${who} trophies: ${points} points${streak > 1 ? `, ${streak} in a row` : ""}`}
      className="inline-flex items-center gap-1.5 sm:gap-2 rounded-2xl border-4 border-sunny-dark bg-sunny px-2.5 sm:px-3 py-1.5 font-display text-lg font-semibold shadow-[0_4px_0_var(--color-sunny-dark)] transition hover:brightness-105 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
    >
      <span aria-hidden="true">⭐</span>
      <motion.span data-testid="points" className="tabular-nums min-w-[1ch]">
        {rounded}
      </motion.span>
      {streak > 1 && (
        <span key={streak} aria-hidden="true" className="animate-pop text-base text-coral">
          🔥{streak}
        </span>
      )}
      <span aria-hidden="true" className="hidden md:inline text-base">
        🏆
      </span>
    </Link>
  );
}
