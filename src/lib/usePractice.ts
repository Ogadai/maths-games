"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Move the shown beat towards the target one beat at a time, letting each
 * beat's animation finish first (one answer can complete two beats at once).
 */
export function useChasedBeat(scene: { frames: { duration: number }[] }, target: number): number {
  const [shown, setShown] = useState(target);
  const changedAt = useRef(0);
  useEffect(() => {
    changedAt.current = performance.now();
  }, [shown]);
  useEffect(() => {
    if (shown === target) return;
    const step = target > shown ? 1 : -1;
    const busyFor = scene.frames[shown].duration * 1000 + 200 - (performance.now() - changedAt.current);
    const id = setTimeout(() => setShown((s) => s + step), Math.max(0, busyFor));
    return () => clearTimeout(id);
  }, [shown, target, scene]);
  return shown;
}

/** Confetti for a solved problem (loaded only when needed). */
export async function celebrate() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, disableForReducedMotion: true });
}
