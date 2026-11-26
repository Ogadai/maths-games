"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSoundOn } from "@/components/ui/SoundToggle";
import { speak, stopSpeaking, unlockAudio } from "@/lib/sound";

const SPEEDS = [0.5, 1, 2];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Roughly how long it takes to read a caption, for when Divvy isn't talking. */
const readingMs = (text: string) => 1200 + text.split(" ").length * 330;

interface BeatPlayerOptions {
  /** Number of beats in the current example. */
  beatCount: number;
  /** Seconds (at 1x) for a beat's animation. */
  duration: (beat: number) => number;
  /** What Divvy says for a beat. */
  narrate: (beat: number) => string;
}

/**
 * Watch mode playback: step through beats by hand, or autoplay, waiting for
 * each beat's animation and Divvy's sentence before moving on.
 */
export function useBeatPlayer({ beatCount, duration, narrate }: BeatPlayerOptions) {
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [soundOn] = useSoundOn();
  const speed = SPEEDS[speedIndex];
  const last = beatCount - 1;
  const narration = narrate(beat);
  const animationSeconds = duration(beat);

  // Divvy only talks after the player has pressed something (browsers insist, and
  // it would be rude to start chatting on page load).
  const interacted = useRef(false);
  const speech = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    speech.current = interacted.current && soundOn ? speak(narration) : Promise.resolve();
  }, [narration, soundOn]);
  useEffect(() => stopSpeaking, []);

  // Autoplay: wait for the animation and Divvy's sentence, then move on.
  useEffect(() => {
    if (!playing) return;
    let cancelled = false;
    const animation = (animationSeconds * 1000) / speed;
    const reading = soundOn ? 0 : readingMs(narration) / speed;
    void Promise.all([sleep(Math.max(animation, reading)), speech.current])
      .then(() => sleep(600 / speed))
      .then(() => {
        if (cancelled) return;
        const next = Math.min(beat + 1, last);
        setBeat(next);
        if (next === last) setPlaying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playing, beat, animationSeconds, speed, soundOn, narration, last]);

  const touch = () => {
    if (!interacted.current && soundOn) unlockAudio();
    interacted.current = true;
  };

  const goTo = (b: number) => {
    touch();
    setPlaying(false);
    setBeat(Math.max(0, Math.min(last, b)));
  };

  const togglePlay = () => {
    touch();
    if (playing) {
      setPlaying(false);
      return;
    }
    if (beat === last) setBeat(0);
    setPlaying(true);
  };

  /** Back to the start of a (new) example. */
  const restart = () => {
    touch();
    setBeat(0);
    setPlaying(false);
  };

  const cycleSpeed = () => setSpeedIndex((i) => (i + 1) % SPEEDS.length);

  return { beat, last, playing, speed, narration, touch, goTo, togglePlay, restart, cycleSpeed };
}

export type BeatPlayer = ReturnType<typeof useBeatPlayer>;

/** Start again, step, play/pause, speed and a progress bar. */
export function PlaybackControls({ player }: { player: BeatPlayer }) {
  const { beat, last, playing, speed, goTo, togglePlay, cycleSpeed } = player;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        <ControlButton label="Start again" onClick={() => goTo(0)} disabled={beat === 0}>
          ⏮
        </ControlButton>
        <ControlButton label="Step back" onClick={() => goTo(beat - 1)} disabled={beat === 0}>
          ◀
        </ControlButton>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="h-12 min-w-28 rounded-2xl bg-coral px-4 font-display text-xl font-semibold text-white shadow-[0_4px_0_#c94848] active:translate-y-1 active:shadow-none focus-visible:outline-4 focus-visible:outline-grape"
        >
          {playing ? "⏸ Pause" : beat === last ? "↻ Replay" : "▶ Play"}
        </button>
        <ControlButton label="Step forward" onClick={() => goTo(beat + 1)} disabled={beat === last}>
          ▶
        </ControlButton>
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Speed ${speed} times`}
          className="h-12 min-w-14 rounded-2xl border-4 border-ink/15 bg-cloud px-2 font-display text-base font-semibold hover:border-grape focus-visible:outline-4 focus-visible:outline-grape"
        >
          {speed === 0.5 ? "🐢" : speed === 2 ? "🐇" : ""} {speed}×
        </button>
      </div>
      <div
        className="h-2 rounded-full bg-ink/10 overflow-hidden"
        role="progressbar"
        aria-label="Steps watched"
        aria-valuemin={1}
        aria-valuemax={last + 1}
        aria-valuenow={beat + 1}
      >
        <div
          className="h-full rounded-full bg-grape transition-[width] duration-500"
          style={{ width: `${last > 0 ? (beat / last) * 100 : 100}%` }}
        />
      </div>
    </div>
  );
}

export function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-2xl border-4 px-3 py-1 font-display text-base sm:text-lg font-semibold focus-visible:outline-4 focus-visible:outline-grape ${
        pressed
          ? "border-grape bg-grape text-white shadow-[0_3px_0_var(--color-grape-dark)]"
          : "border-ink/15 bg-cloud hover:border-grape"
      }`}
    >
      {children}
    </button>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-12 w-12 rounded-2xl border-4 border-ink/15 bg-cloud font-display text-xl hover:border-grape disabled:opacity-35 focus-visible:outline-4 focus-visible:outline-grape"
    >
      {children}
    </button>
  );
}
