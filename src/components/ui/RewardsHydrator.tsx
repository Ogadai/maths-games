"use client";

import { useEffect } from "react";
import { useRewards } from "@/lib/rewards/store";

/**
 * Loads saved progress from localStorage once the page has hydrated, so the
 * server render and the first client render always match.
 */
export function RewardsHydrator() {
  useEffect(() => {
    void Promise.resolve(useRewards.persist.rehydrate()).finally(() => {
      // Also covers storage being blocked, where the persist callback may not run.
      useRewards.setState({ hydrated: true });
    });
  }, []);
  return null;
}
