"use client";

import { useSyncExternalStore } from "react";

/** Live result of a CSS media query. The server render uses `fallback`. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** True on touch-first devices (phones, tablets), where we show our own number pad. */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
