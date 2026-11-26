import { afterEach, describe, expect, it, vi } from "vitest";
import { speak, speakNext, stopSpeaking, toSpeech } from "./sound";

describe("toSpeech", () => {
  it("says times-table plurals as words", () => {
    expect(toSpeech("Let's go! How many 3s fit into 6?")).toBe("Let's go! How many threes fit into 6?");
    expect(toSpeech("How many 12s fit into 30?")).toBe("How many twelves fit into 30?");
  });

  it("reads maths symbols as words", () => {
    expect(toSpeech("Too big! 4 × 3 = 12, which is more than 10.")).toBe(
      "Too big! 4 times 3 = 12, which is more than 10.",
    );
    expect(toSpeech("What is 13 − 12?")).toBe("What is 13 minus 12?");
    expect(toSpeech("852 ÷ 4 = 213")).toBe("852 divided by 4 = 213");
  });

  it("drops emoji", () => {
    expect(toSpeech("🎉 You did it! 852 ÷ 4 = 213")).toBe("You did it! 852 divided by 4 = 213");
  });
});

describe("speech queue", () => {
  /** A fake speech engine: each line ends when the test calls finish(). */
  function fakeSpeech() {
    const said: string[] = [];
    let current: { onend: (() => void) | null } | null = null;
    class Utterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const synth = {
      getVoices: () => [],
      speak(u: Utterance) {
        said.push(u.text);
        current = u;
      },
      cancel() {
        const u = current;
        current = null;
        u?.onend?.();
      },
    };
    vi.stubGlobal("window", { speechSynthesis: synth, setTimeout: () => 0, clearTimeout: () => {} });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const tick = () => new Promise((r) => setTimeout(r, 0));
    return {
      said,
      async finish() {
        const u = current;
        current = null;
        u?.onend?.();
        await tick();
      },
      tick,
    };
  }

  afterEach(() => {
    stopSpeaking();
    vi.unstubAllGlobals();
  });

  it("reads queued lines one after another", async () => {
    const fake = fakeSpeech();
    void speak("You did it!");
    const joke = speakNext("Why was 6 afraid of 7?");
    await fake.tick();
    expect(fake.said).toEqual(["You did it!"]);
    await fake.finish();
    expect(fake.said).toEqual(["You did it!", "Why was 6 afraid of 7?"]);
    await fake.finish();
    expect(await joke).toBe(true);
  });

  it("drops queued lines when Divvy is interrupted", async () => {
    const fake = fakeSpeech();
    void speak("You did it!");
    const joke = speakNext("Why was 6 afraid of 7?");
    void speak("Let's go!");
    await fake.tick();
    expect(await joke).toBe(false);
    expect(fake.said).toEqual(["You did it!", "Let's go!"]);
  });

  it("skips a queued line whose signal was aborted", async () => {
    const fake = fakeSpeech();
    void speak("You did it!");
    const controller = new AbortController();
    const first = speakNext("Why was 6 afraid of 7?", controller.signal);
    const second = speakNext("Because 7, 8, 9!");
    controller.abort();
    await fake.finish();
    await fake.finish();
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(fake.said).toEqual(["You did it!", "Because 7, 8, 9!"]);
  });
});
