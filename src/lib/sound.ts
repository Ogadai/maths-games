/**
 * Sound effects (synthesised with the Web Audio API, so there are no audio
 * files to download) and Divvy's text-to-speech voice.
 *
 * Browsers only allow audio to start from a user action (a click or tap), so
 * call `unlockAudio()` and the first `speak()` straight from a click handler.
 * Everything here is a safe no-op on the server or in browsers without support.
 */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Wake audio up. Must be called from inside a user action (click/tap). */
export function unlockAudio() {
  const c = audio();
  if (!c) return;
  if (c.state !== "running") void c.resume().catch(() => {});
  // Older iOS Safari only fully unlocks once something has actually played.
  const silent = c.createBufferSource();
  silent.buffer = c.createBuffer(1, 1, 22050);
  silent.connect(c.destination);
  silent.start(0);
}

interface Note {
  freq: number;
  /** Seconds after "now". */
  at: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the note's duration. */
  slideTo?: number;
}

function play(notes: Note[]) {
  const c = audio();
  if (!c || c.state !== "running") return;
  const now = c.currentTime;
  for (const { freq, at, duration, type = "sine", volume = 0.2, slideTo } of notes) {
    const t0 = now + at;
    const t1 = t0 + duration;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t1);
    // Quick fade in and out so notes don't click.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t1 + 0.05);
  }
}

/** A soft, low "uh-oh" for a wrong answer. */
export function playOops() {
  play([
    { freq: 300, at: 0, duration: 0.16, type: "triangle", volume: 0.25, slideTo: 260 },
    { freq: 220, at: 0.17, duration: 0.24, type: "triangle", volume: 0.25, slideTo: 170 },
  ]);
}

/** A bright two-note chime for a correct step. */
export function playCorrect() {
  play([
    { freq: 784, at: 0, duration: 0.14, volume: 0.18 }, // G5
    { freq: 1175, at: 0.09, duration: 0.3, volume: 0.18 }, // D6
  ]);
}

/** A little fanfare for finishing a whole problem. */
export function playCelebrate() {
  const arpeggio = [523, 659, 784, 1047]; // C5 E5 G5 C6
  play([
    ...arpeggio.map((freq, i) => ({ freq, at: i * 0.09, duration: 0.18, type: "triangle" as const })),
    { freq: 1047, at: 0.4, duration: 0.6, type: "triangle", volume: 0.2 },
    { freq: 1319, at: 0.4, duration: 0.6, volume: 0.12 }, // E6
    { freq: 1568, at: 0.4, duration: 0.6, volume: 0.1 }, // G6
    // Sparkles
    { freq: 2093, at: 0.55, duration: 0.12, volume: 0.06 },
    { freq: 2637, at: 0.65, duration: 0.12, volume: 0.06 },
    { freq: 3136, at: 0.75, duration: 0.15, volume: 0.05 },
  ]);
}

// ---------------------------------------------------------------------------
// Text to speech
// ---------------------------------------------------------------------------

const PLURALS = [
  "zeros", "ones", "twos", "threes", "fours", "fives", "sixes",
  "sevens", "eights", "nines", "tens", "elevens", "twelves",
];

/**
 * Turn an on-screen message into something that reads aloud naturally:
 * drop emoji, say maths symbols as words, and make "3s" say "threes"
 * (otherwise some voices read it as "3 seconds").
 */
export function toSpeech(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/[−–]/g, " minus ")
    .replace(/\b(\d+)s\b/g, (match, n: string) => PLURALS[Number(n)] ?? match)
    .replace(/\s+([!?.,])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

/** Prefer an en-GB Google female voice, then any en-GB female, then any en-GB voice. */
function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const british = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace("_", "-").toLowerCase() === "en-gb");
  const female = (v: SpeechSynthesisVoice) => /female/i.test(v.name);
  const google = (v: SpeechSynthesisVoice) => /google/i.test(v.name);
  cachedVoice =
    british.find((v) => google(v) && female(v)) ??
    british.find(female) ??
    british.find(google) ??
    british[0] ??
    null;
  return cachedVoice;
}

if (speechSupported()) {
  // Voices often load asynchronously (Chrome), so re-pick once they arrive.
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cachedVoice = null;
  });
}

/** Say one utterance without interrupting. Resolves when it ends or is cancelled. */
function utter(spoken: string): Promise<void> {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = "en-GB";
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  utterance.pitch = 1.1;
  return new Promise((resolve) => {
    const words = spoken.split(" ").length;
    const fallback = window.setTimeout(resolve, 1500 + words * 450);
    utterance.onend = utterance.onerror = () => {
      window.clearTimeout(fallback);
      resolve();
    };
    synth.speak(utterance);
  });
}

/** Bumped whenever Divvy is interrupted, so queued lines know to give up. */
let generation = 0;
/** Settles when everything Divvy has been asked to say is finished. */
let tail: Promise<unknown> = Promise.resolve();

/**
 * Read a message aloud, interrupting anything Divvy was already saying (and
 * dropping anything queued). Resolves when Divvy stops talking (or after a
 * generous estimate, because some browsers never fire the "end" event).
 */
export function speak(text: string): Promise<void> {
  if (!speechSupported()) return Promise.resolve();
  generation++;
  window.speechSynthesis.cancel();
  const spoken = toSpeech(text);
  const done = spoken ? utter(spoken) : Promise.resolve();
  tail = done;
  return done;
}

/**
 * Read a message aloud once Divvy has finished everything already said or
 * queued. Resolves true if it was read out in full, or false if Divvy was
 * interrupted first (by `speak` or `stopSpeaking`), in which case it may
 * not have been said at all. Aborting `signal` before its turn comes skips it.
 */
export function speakNext(text: string, signal?: AbortSignal): Promise<boolean> {
  if (!speechSupported()) return Promise.resolve(true);
  const gen = generation;
  const spoken = toSpeech(text);
  const done = tail.then(async () => {
    if (gen !== generation || signal?.aborted) return false;
    if (spoken) await utter(spoken);
    return gen === generation;
  });
  tail = done;
  return done;
}

export function stopSpeaking() {
  if (!speechSupported()) return;
  generation++;
  tail = Promise.resolve();
  window.speechSynthesis.cancel();
}
