"use client";

import { usePersistentFlag } from "@/lib/usePersistentFlag";
import { playCorrect, stopSpeaking, unlockAudio } from "@/lib/sound";

/** Whether the player wants sound effects and Divvy's voice. Remembered in localStorage. */
export function useSoundOn() {
  return usePersistentFlag("sumcraft:sound-on", true);
}

export function SoundToggle() {
  const [soundOn, setSoundOn] = useSoundOn();

  const toggle = () => {
    if (soundOn) {
      stopSpeaking();
      setSoundOn(false);
    } else {
      setSoundOn(true);
      unlockAudio();
      playCorrect(); // so the player hears that sound is back on
    }
  };

  return (
    <button
      type="button"
      aria-pressed={soundOn}
      aria-label="Sound"
      title={soundOn ? "Sound is on" : "Sound is off"}
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-2xl border-4 px-3 py-1.5 font-display text-lg font-semibold focus-visible:outline-4 focus-visible:outline-grape ${
        soundOn
          ? "border-grape bg-grape text-white shadow-[0_4px_0_var(--color-grape-dark)]"
          : "border-ink/20 bg-cloud text-ink-soft hover:border-grape"
      }`}
    >
      <span aria-hidden="true" className="text-xl">
        {soundOn ? "🔊" : "🔇"}
      </span>
      <span aria-hidden="true" className="hidden sm:inline">
        {soundOn ? "Sound on" : "Sound off"}
      </span>
    </button>
  );
}
