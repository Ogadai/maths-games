"use client";

import { useSyncExternalStore } from "react";
import { INSTALL_EVENT } from "./installScript";

/**
 * Chromium's install event (Android Chrome, Edge, Samsung Internet). Not in the DOM typings.
 * Calling prompt() opens the browser's own "Install app?" sheet; each event can be used once.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Captured by INSTALL_CAPTURE_SCRIPT (installScript.ts), which runs before React loads. */
    __sumcraftInstallEvent?: BeforeInstallPromptEvent | null;
    __sumcraftInstalled?: boolean;
  }
  interface Navigator {
    /** iOS Safari: true when launched from the home screen. */
    standalone?: boolean;
  }
}

const EVENT = INSTALL_EVENT;

/**
 * - `installed`: already running as an installed app (or just installed) - offer nothing.
 * - `native`:    the browser handed us an install event - we can open its install sheet.
 * - `ios`:       iPhone/iPad - no install API, so we explain Share > Add to Home Screen.
 * - `manual`:    anything else - we point at the browser menu.
 */
export type InstallMode = "installed" | "native" | "ios" | "manual";

export interface InstallEnvironment {
  standalone: boolean;
  hasInstallEvent: boolean;
  userAgent: string;
  maxTouchPoints: number;
}

export function isIOSDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  // iPadOS Safari pretends to be a Mac; real Macs have no touch screen.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function detectInstallMode(env: InstallEnvironment): InstallMode {
  if (env.standalone) return "installed";
  if (env.hasInstallEvent) return "native";
  if (isIOSDevice(env.userAgent, env.maxTouchPoints)) return "ios";
  return "manual";
}

const STANDALONE_QUERY = "(display-mode: standalone)";

function currentMode(): InstallMode {
  return detectInstallMode({
    standalone:
      window.__sumcraftInstalled === true ||
      window.matchMedia(STANDALONE_QUERY).matches ||
      navigator.standalone === true,
    hasInstallEvent: Boolean(window.__sumcraftInstallEvent),
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
}

function subscribe(onChange: () => void) {
  const standalone = window.matchMedia(STANDALONE_QUERY);
  window.addEventListener(EVENT, onChange);
  standalone.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    standalone.removeEventListener("change", onChange);
  };
}

/** How (or whether) this device can install SumCraft. The server render says `installed`, so nothing shows. */
export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, currentMode, () => "installed");
}

/**
 * Opens the browser's install sheet. Must be called from a tap/click handler.
 * Resolves to whether the player accepted; `unavailable` if there's no install event.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = window.__sumcraftInstallEvent;
  if (!event) return "unavailable";
  // Each event works only once; the browser sends a fresh one if it's still installable.
  window.__sumcraftInstallEvent = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  } finally {
    window.dispatchEvent(new Event(EVENT));
  }
}
