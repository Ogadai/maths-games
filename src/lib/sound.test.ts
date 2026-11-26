import { describe, expect, it } from "vitest";
import { toSpeech } from "./sound";

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
