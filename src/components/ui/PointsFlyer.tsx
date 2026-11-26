"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import type { ScoreBreakdown } from "@/lib/rewards/rules";

/** How long the star takes to pop up and fly to the points badge. */
export const FLIGHT_SECONDS = 1.6;
/** Marks the element the star flies to (the header's points badge). */
export const POINTS_TARGET_ATTR = "data-points-target";

export interface Point {
  x: number;
  y: number;
}

export interface Award {
  score: ScoreBreakdown;
  from: Point;
  to: Point;
}

/**
 * Work out where the star starts (the top of `fromEl`) and where it lands
 * (the points badge, kept on screen even when the header has scrolled away).
 * Call from an event handler, when the answer is completed.
 */
export function flightPath(fromEl: Element | null): { from: Point; to: Point } {
  const start = fromEl?.getBoundingClientRect();
  const from = start
    ? { x: start.left + start.width / 2, y: start.top + 40 }
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target = document.querySelector(`[${POINTS_TARGET_ATTR}]`)?.getBoundingClientRect();
  const to = target
    ? {
        x: Math.min(Math.max(target.left + target.width / 2, 24), window.innerWidth - 24),
        y: Math.max(target.top + target.height / 2, 16),
      }
    : { x: from.x, y: 16 };
  return { from, to };
}

/** A gold star showing the points just earned, rising up to the points badge. */
export function PointsFlyer({ award }: { award: Award }) {
  const reduceMotion = useReducedMotion();
  const [finished, setFinished] = useState(false);
  if (finished) return null;

  const { score, from, to } = award;
  const lift = from.y - 30;
  const animate = reduceMotion
    ? { x: from.x, y: lift, scale: 1, opacity: [0, 1, 1, 0] }
    : {
        x: [from.x, from.x, from.x, to.x],
        y: [from.y, lift, lift, to.y],
        scale: [0.3, 1.25, 1, 0.3],
        opacity: [0, 1, 1, 0.4],
      };

  return createPortal(
    <motion.div
      aria-hidden="true"
      data-testid="points-flyer"
      className="fixed left-0 top-0 z-50 pointer-events-none"
      initial={{ x: from.x, y: reduceMotion ? lift : from.y, scale: 0.3, opacity: 0 }}
      animate={animate}
      transition={{
        duration: reduceMotion ? 1.5 : FLIGHT_SECONDS,
        times: [0, 0.18, 0.5, 1],
        ease: "easeInOut",
      }}
      onAnimationComplete={() => setFinished(true)}
    >
      <div className="-translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="relative w-24 h-24 drop-shadow-[0_4px_0_rgb(224_168_0/0.8)]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <polygon
              points="50,4 62,36 96,37 69,58 79,92 50,72 21,92 31,58 4,37 38,36"
              fill="#FFC93C"
              stroke="#E0A800"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center pt-2 font-display text-2xl font-bold text-ink">
            +{score.total}
          </span>
        </div>
        {score.multiplier > 1 && (
          <span className="-mt-1 rounded-full bg-coral px-2 py-0.5 font-display text-sm font-semibold text-white whitespace-nowrap">
            🔥 {score.streak} in a row ×{score.multiplier}
          </span>
        )}
      </div>
    </motion.div>,
    document.body,
  );
}
