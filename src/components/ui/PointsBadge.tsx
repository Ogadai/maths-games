"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { activeProfile, useRewards } from "@/lib/rewards/store";
import { FLIGHT_SECONDS, POINTS_TARGET_ATTR } from "./PointsFlyer";

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
  const badgeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    // Saved points appear straight away on page load; new points count up.
    if (!shownOnce.current || reduceMotion) {
      shownOnce.current = true;
      value.jump(points);
      return;
    }
    // Newly earned points wait for the flying star to land, then count up with a bump.
    const delay = points > value.get() ? FLIGHT_SECONDS * 0.9 : 0;
    const count = animate(value, points, { duration: 1.2, ease: "easeOut", delay });
    const bump = badgeRef.current
      ? animate(badgeRef.current, { scale: [1, 1.18, 1] }, { duration: 0.4, delay })
      : null;
    return () => {
      count.stop();
      bump?.stop();
    };
  }, [points, hydrated, reduceMotion, value]);

  const who = nickname ? `${nickname}'s` : "Your";
  return (
    <Link
      ref={badgeRef}
      href="/trophies"
      {...{ [POINTS_TARGET_ATTR]: "" }}
      aria-label={`${who} trophies: ${points} points${streak > 1 ? `, ${streak} in a row` : ""}`}
      className="inline-flex items-center gap-1.5 sm:gap-2 rounded-2xl border-4 border-sunny-dark bg-sunny px-2.5 sm:px-3 py-1.5 font-display text-lg font-semibold shadow-[0_4px_0_var(--color-sunny-dark)] transition-[filter,box-shadow] hover:brightness-105 active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
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
