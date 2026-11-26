import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/random";
import { solveBusStop } from "./busStop";
import {
  boardAt,
  buildScene,
  narrate,
  practiceBeatIndex,
  practiceCaption,
  whatIfFrame,
  type BlockKind,
  type BusStopScene,
} from "./busStopScene";

const VALUE: Record<BlockKind, number> = { thousands: 1000, hundreds: 100, tens: 10, ones: 1 };

function totalValue(scene: BusStopScene, frameIndex: number) {
  return scene.frames[frameIndex].blocks.reduce((sum, b) => sum + VALUE[b.kind], 0);
}

describe("buildScene", () => {
  const scene = buildScene(solveBusStop(5432, 7));

  it("has a share beat per column and an exchange beat per carry", () => {
    expect(scene.beats.map((b) => (b.kind === "share" || b.kind === "exchange" ? `${b.kind}${b.step}` : b.kind))).toEqual([
      "intro",
      "share0",
      "exchange0",
      "share1",
      "exchange1",
      "share2",
      "exchange2",
      "share3",
      "finish",
    ]);
    expect(scene.frames).toHaveLength(scene.beats.length);
  });

  it("starts with the dividend's digits as blocks at the stop", () => {
    const counts = (kind: BlockKind) => scene.frames[0].blocks.filter((b) => b.kind === kind).length;
    expect([counts("thousands"), counts("hundreds"), counts("tens"), counts("ones")]).toEqual([5, 4, 3, 2]);
  });

  it("gives every bus the quotient digit and leaves the remainder at the stop", () => {
    const frame = scene.frames[3]; // share1: 54 hundreds between 7 buses
    const hundreds = frame.blocks.filter((b) => b.kind === "hundreds");
    const atStop = hundreds.filter((b) => b.leftover);
    expect(atStop).toHaveLength(5);
    expect(hundreds).toHaveLength(54);
  });

  it("swaps each leftover for ten of the next block, appearing from where it was", () => {
    const share = scene.frames[1];
    const exchange = scene.frames[2];
    expect(share.blocks.filter((b) => b.leftover)).toHaveLength(5);
    expect(exchange.blocks.filter((b) => b.kind === "thousands")).toHaveLength(0);
    expect(exchange.blocks.filter((b) => b.kind === "hundreds")).toHaveLength(54);
    expect(exchange.blocks.filter((b) => b.from)).toHaveLength(50);
    expect(exchange.bursts).toHaveLength(5);
  });

  it("never loses or invents value, for lots of problems", () => {
    const rng = createRng(3);
    for (let t = 0; t < 300; t++) {
      const dividend = 10 + Math.floor(rng() * 9990);
      const divisor = 2 + Math.floor(rng() * 11);
      const s = buildScene(solveBusStop(dividend, divisor));
      s.frames.forEach((_, f) => expect(totalValue(s, f)).toBe(dividend));
      for (const frame of s.frames) {
        const ids = frame.blocks.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const b of frame.blocks) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x).toBeLessThan(s.layout.width);
          expect(b.y).toBeLessThan(s.layout.height);
        }
      }
    }
  });
});

describe("boardAt", () => {
  const scene = buildScene(solveBusStop(5432, 7));

  it("fills the board in as the beats play", () => {
    expect(boardAt(scene, 0)).toMatchObject({ quotient: [null, null, null, null], focusIndex: 0 });
    expect(boardAt(scene, 2)).toMatchObject({ quotient: [0, null, null, null], carries: [null, 5, null, null], focusIndex: 1 });
    expect(boardAt(scene, scene.beats.length - 1)).toMatchObject({
      quotient: [0, 7, 7, 6],
      carries: [null, 5, 5, 4],
      remainder: undefined,
      focusIndex: null,
    });
  });

  it("shows a final remainder after the last share", () => {
    const s = buildScene(solveBusStop(853, 4));
    expect(boardAt(s, s.beats.length - 2).remainder).toBe(1);
  });
});

describe("Practise mode", () => {
  const scene = buildScene(solveBusStop(5432, 7));

  it("runs one step behind the student's answers", () => {
    expect(scene.beats[practiceBeatIndex(scene, 0, "quotient")].kind).toBe("intro");
    expect(scene.beats[practiceBeatIndex(scene, 0, "carry")]).toEqual({ kind: "share", step: 0 });
    expect(scene.beats[practiceBeatIndex(scene, 1, "quotient")]).toEqual({ kind: "exchange", step: 0 });
    expect(scene.beats[practiceBeatIndex(scene, 3, "done")].kind).toBe("finish");
  });

  it("explains an answer that is too big", () => {
    const { frame, message } = whatIfFrame(scene, 1, 8);
    expect(message).toBe("8 each won't fit! You'd need 56 hundreds, but there are only 54.");
    expect(frame.ghosts).toHaveLength(2);
  });

  it("explains an answer that is too small", () => {
    const { frame, message } = whatIfFrame(scene, 1, 6);
    expect(message).toContain("12 hundreds are still waiting");
    expect(frame.blocks.filter((b) => b.leftover)).toHaveLength(12);
    expect(frame.ghosts).toHaveLength(0);
  });

  it("doesn't give away the leftover count", () => {
    expect(practiceCaption(scene, 3)).toBe("Each bus gets 7. Count the hundreds left at the stop!");
  });
});

describe("narrate", () => {
  it("talks through swapping a leftover", () => {
    const scene = buildScene(solveBusStop(1234, 2));
    expect(narrate(scene, 2)).toBe("1 thousand left over, so swap it for 10 hundreds. Now we have 12 hundreds.");
  });

  it("finishes with the answer", () => {
    const scene = buildScene(solveBusStop(853, 4));
    expect(narrate(scene, scene.beats.length - 1)).toBe("Every bus carries 213. So 853 ÷ 4 = 213 remainder 1! 🎉");
  });
});
