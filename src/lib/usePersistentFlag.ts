"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "sumcraft-storage";

function read(key: string): boolean | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? null : value === "true";
  } catch {
    return null; // storage blocked (private mode etc.)
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * A boolean remembered in localStorage. The server render (and the very first
 * client render) uses `fallback`, so there's no hydration mismatch.
 */
export function usePersistentFlag(key: string, fallback: boolean) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        // Ignore: the choice just won't be remembered.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, setValue] as const;
}
