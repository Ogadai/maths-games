import { expect, test, type Page } from "@playwright/test";
import { canGlue, gcd, solveFraction, type FractionProblem } from "../src/lib/maths/fractions";
import {
  ASK_LABELS,
  answerSimplest,
  applyAnswer,
  currentPart,
  startPractice,
  type PracticeState,
} from "../src/lib/maths/fractionPractice";
import type { FractionAsk } from "../src/lib/maths/fractionScene";

const URL = "/topics/fractions";

/** The practice section, so "How it works" (which also has a board and a speech bubble) doesn't get in the way. */
const practice = (page: Page) => page.getByRole("region", { name: /Your turn/ });

async function readProblem(page: Page): Promise<FractionProblem> {
  const label = await practice(page).getByRole("group", { name: /Working out/ }).getAttribute("aria-label");
  const [, a, b, op, c, d] = label!.match(/(\d+)\/(\d+) ([+−]) (\d+)\/(\d+)/)!;
  return { a: Number(a), b: Number(b), c: Number(c), d: Number(d), op: op === "+" ? "+" : "-" };
}

/** The right answer for a typed step (gluing by the smallest group size that works). */
function rightAnswer(s: PracticeState): number {
  const sol = s.solution;
  const { n, d } = currentPart(s);
  const k = s.glues.at(-1)?.k ?? 1;
  switch (s.ask) {
    case "den": return sol.denominator;
    case "nA": return sol.nA;
    case "nB": return sol.nB;
    case "total": return sol.total;
    case "whole": return 1;
    case "rest": return sol.mixed.n;
    case "glue": {
      let g = 2;
      while (!canGlue(n, d, g)) g++;
      return g;
    }
    case "glueN": return n / k;
    case "glueD": return d / k;
    default: throw new Error(`No typed answer for ${s.ask}`);
  }
}

async function solveCurrentProblem(page: Page, opts: { mistakeAt?: FractionAsk } = {}) {
  let s = startPractice(solveFraction(await readProblem(page)));
  const status = practice(page).getByRole("status");
  await expect(status).toContainText(s.message);
  while (s.ask !== "done") {
    if (s.ask === "simplest") {
      const { n, d } = currentPart(s);
      const simplest = gcd(n, d) === 1;
      await practice(page).getByRole("button", { name: simplest ? /Simplest/ : /Glue more/ }).click();
      s = answerSimplest(s, simplest);
      await expect(status).toContainText(s.message);
      continue;
    }
    const box = practice(page).getByRole("textbox", { name: ASK_LABELS[s.ask] });
    const answer = rightAnswer(s);
    if (opts.mistakeAt === s.ask) {
      const { n, d } = currentPart(s);
      let wrong = answer + 1;
      if (s.ask === "glue") while (canGlue(n, d, wrong)) wrong++;
      await box.fill(String(wrong));
      await practice(page).getByRole("button", { name: /Check/ }).click();
      await expect(status).toContainText(applyAnswer(s, wrong).message);
      // The picture shows why it's wrong.
      await expect(
        practice(page).getByText(/👆|don't make groups|only \d+ pieces/).first(),
      ).toBeVisible();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `test-results/fractions-mistake-${s.ask}-${test.info().project.name}.png` });
    }
    await box.fill(String(answer));
    await practice(page).getByRole("button", { name: /Check/ }).click();
    s = applyAnswer(s, answer);
    await expect(status).toContainText(s.message);
  }
  return s;
}

test("landing page links to Adding Fractions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Adding Fractions/ }).click();
  await expect(page.getByRole("heading", { name: "Adding Fractions", level: 1 })).toBeVisible();
});

test("Watch mode cuts, spills over and glues 3/4 + 1/2", async ({ page }) => {
  await page.goto(URL);
  const intro = page.getByRole("region", { name: "How it works" });
  await intro.getByRole("button", { name: /3 over 4/ }).click();
  const narration = intro.getByRole("status");
  const board = intro.getByRole("group", { name: /Working out 3\/4 \+ 1\/2/ });
  const forward = intro.getByRole("button", { name: "Step forward" });
  const steps = [
    // Board text reads each fraction top then bottom, line by line.
    { say: "Uh-oh: quarters and halves are different sizes", board: "34+12" },
    { say: "Now both trays have 4 × 2 = 8 pieces", board: "34+12=8+8" },
    { say: "3 quarters = 6 eighths", board: "34+12=68+48" },
    { say: "6 + 4 = 10 pieces. That's too many for one tray!", board: "34+12=68+48=108" },
    { say: "1 whole tray and 2 eighths more", board: "34+12=68+48=108=128" },
    { say: "Glue the pieces into groups of 2", board: "34+12=68+48=108=128=114" },
    { say: "So 3 quarters plus 1 half is 1 whole and 1 quarter!", board: "34+12=68+48=108=128=114" },
  ];
  for (const [i, step] of steps.entries()) {
    if (i > 0) await forward.click();
    await expect(narration).toContainText(step.say);
    await expect(board).toHaveText(step.board);
    if (i === 1 || i === 4 || i === 5) {
      await page.waitForTimeout(2200); // let the animation settle for the screenshot
      await intro.getByRole("img").screenshot({ path: `test-results/fractions-watch-${i}-${test.info().project.name}.png` });
    }
  }
  await expect(forward).toBeDisabled();
});

test("Watch mode plays a take-away by itself, and your own problem", async ({ page }) => {
  await page.goto(URL);
  // Headless Chrome never finishes speaking, so Divvy would wait for the fallback timer.
  await page.getByRole("button", { name: "Sound" }).click();
  const intro = page.getByRole("region", { name: "How it works" });
  await intro.getByRole("button", { name: /2 over 3/ }).click();
  await intro.getByRole("button", { name: "Speed 1 times" }).click();
  await intro.getByRole("button", { name: "Play" }).click();
  await expect(intro.getByRole("status")).toContainText("Munch!", { timeout: 30_000 });
  await page.waitForTimeout(300);
  await intro.getByRole("img").screenshot({ path: `test-results/fractions-munch-${test.info().project.name}.png` });
  await expect(intro.getByRole("status")).toContainText("is 5 twelfths", { timeout: 30_000 });

  await intro.getByRole("button", { name: /My own/ }).click();
  await intro.getByRole("textbox", { name: "First top number" }).fill("2");
  await intro.getByRole("textbox", { name: "First bottom number" }).fill("5");
  await intro.getByRole("textbox", { name: "Second top number" }).fill("1");
  await intro.getByRole("textbox", { name: "Second bottom number" }).fill("5");
  await intro.getByRole("button", { name: /Watch it/ }).click();
  await expect(intro.getByRole("status")).toContainText("Both trays are cut into fifths");
});

for (const [level, mistakeAt] of [
  ["Warm-up", undefined],
  ["Explorer", "den"],
  ["Champion", "nA"],
  ["Legend", "glue"],
] as const) {
  test(`solve a ${level} fractions problem`, async ({ page }) => {
    await page.goto(URL);
    await page.getByRole("button", { name: "Sound" }).click();
    await page.getByRole("button", { name: new RegExp(level) }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `test-results/fractions-${level}-start-${test.info().project.name}.png` });
    await solveCurrentProblem(page, { mistakeAt });
    await expect(practice(page).getByRole("status")).toContainText("You did it!");
    await expect(practice(page).getByRole("region", { name: "Joke" })).toBeVisible();
    // Even a long Legend working-out leaves Divvy below the level buttons.
    const chips = (await practice(page).getByRole("group", { name: "Level" }).boundingBox())!;
    const bubble = (await practice(page).getByRole("status").boundingBox())!;
    expect(bubble.y).toBeGreaterThanOrEqual(chips.y + chips.height - 1);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/fractions-${level}-done-${test.info().project.name}.png`, fullPage: true });
  });
}

test("the trays and the board fit on screen together", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("button", { name: /Got it/ }).click();
  await practice(page).getByRole("button", { name: /Legend/ }).click();
  await page.waitForTimeout(1200); // smooth scroll + pieces popping in
  const viewport = page.viewportSize()!;
  for (const target of [
    practice(page).getByRole("img"),
    practice(page).getByRole("group", { name: /Working out/ }),
    practice(page).getByRole("textbox", { name: ASK_LABELS.den }),
    practice(page).getByRole("button", { name: /Hint/ }),
  ]) {
    const box = (await target.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  }
  expect(await practice(page).getByRole("img").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(150);
});

test("a solved fractions problem counts towards the Fractions medals", async ({ page }) => {
  await page.goto(URL);
  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("button", { name: /Warm-up/ }).click();
  await solveCurrentProblem(page);
  await page.goto("/trophies");
  await expect(page.getByRole("listitem", { name: /Fractions Bronze: locked/ })).toContainText("1 / 5");
});
