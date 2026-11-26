"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { JOKES } from "@/data/jokes";
import {
  emptyProgress,
  nextJoke,
  recordSolve,
  type Progress,
  type ScoreBreakdown,
  type SolvedProblem,
} from "./rules";

export interface Profile {
  id: string;
  /** Empty until the player chooses one. */
  nickname: string;
  progress: Progress;
}

interface RewardsState {
  profiles: Profile[];
  activeId: string;
  /** True once saved progress has been loaded from localStorage. */
  hydrated: boolean;
  /** Medals waiting to be celebrated in the unlock modal (not saved). */
  pendingMedals: string[];

  solve: (problem: SolvedProblem) => ScoreBreakdown;
  /** Pick a joke the active player hasn't seen yet and remember it. */
  drawJoke: () => number;
  dismissMedal: () => void;
  setNickname: (nickname: string) => void;
  addProfile: (nickname: string) => void;
  switchProfile: (id: string) => void;
  removeProfile: (id: string) => void;
  resetProgress: () => void;
}

const newId = () => Math.random().toString(36).slice(2, 10);

function newProfile(nickname = ""): Profile {
  return { id: newId(), nickname, progress: emptyProgress() };
}

const FIRST = newProfile();

/** Update the active profile's progress. */
function withProgress(state: RewardsState, update: (p: Progress) => Progress): Partial<RewardsState> {
  return {
    profiles: state.profiles.map((profile) =>
      profile.id === state.activeId ? { ...profile, progress: update(profile.progress) } : profile,
    ),
  };
}

export function activeProfile(state: Pick<RewardsState, "profiles" | "activeId">): Profile {
  return state.profiles.find((p) => p.id === state.activeId) ?? state.profiles[0];
}

export const STORAGE_KEY = "sumcraft:rewards";

/**
 * Points, streaks, medals and seen jokes for each player on this device,
 * saved in localStorage. Loading is deferred until after hydration (see
 * RewardsHydrator) so the server and first client render agree.
 */
export const useRewards = create<RewardsState>()(
  persist(
    (set, get) => ({
      profiles: [FIRST],
      activeId: FIRST.id,
      hydrated: false,
      pendingMedals: [],

      solve: (problem) => {
        const state = get();
        const result = recordSolve(activeProfile(state).progress, problem);
        set({
          ...withProgress(state, () => result.progress),
          pendingMedals: [...state.pendingMedals, ...result.newMedals],
        });
        return result.score;
      },

      drawJoke: () => {
        const state = get();
        const { index, seen } = nextJoke(activeProfile(state).progress.jokesSeen, JOKES.length);
        set(withProgress(state, (p) => ({ ...p, jokesSeen: seen })));
        return index;
      },

      dismissMedal: () => set((s) => ({ pendingMedals: s.pendingMedals.slice(1) })),

      setNickname: (nickname) =>
        set((s) => ({
          profiles: s.profiles.map((p) => (p.id === s.activeId ? { ...p, nickname } : p)),
        })),

      addProfile: (nickname) => {
        const profile = newProfile(nickname);
        set((s) => ({ profiles: [...s.profiles, profile], activeId: profile.id, pendingMedals: [] }));
      },

      switchProfile: (id) => set({ activeId: id, pendingMedals: [] }),

      removeProfile: (id) =>
        set((s) => {
          const remaining = s.profiles.filter((p) => p.id !== id);
          const profiles = remaining.length ? remaining : [newProfile()];
          const activeId = profiles.some((p) => p.id === s.activeId) ? s.activeId : profiles[0].id;
          return { profiles, activeId, pendingMedals: [] };
        }),

      resetProgress: () => set((s) => ({ ...withProgress(s, emptyProgress), pendingMedals: [] })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ profiles: s.profiles, activeId: s.activeId }),
      skipHydration: true,
      onRehydrateStorage: () => () => useRewards.setState({ hydrated: true }),
    },
  ),
);

/** The active player's profile. */
export function useActiveProfile(): Profile {
  return useRewards(activeProfile);
}
