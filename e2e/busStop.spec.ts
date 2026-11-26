import { expect, test, type Page } from "@playwright/test";
import { solveBusStop } from "../src/lib/maths/busStop";

/** The practice section, so "How it works" (which also has a board and a speech bubble) doesn't get in the way. */
const practice = (page: Page) => page.getByRole("region", { name: /Your turn/ });

async function solveCurrentProblem(page: Page, opts: { makeMistake?: boolean } = {}) {
  const label = await practice(page).getByRole("group", { name: /divided by/ }).getAttribute("aria-label");
  const [, dividend, divisor] = label!.match(/(\d+) divided by (\d+)/)!;
  const solution = solveBusStop(Number(dividend), Number(divisor));
  const answerBox = (name: string) => page.getByRole("textbox", { name });
  const type = async (name: string, value: number) => {
    const box = answerBox(name);
    await box.fill(String(value));
    // Leftovers for divisors 11 and 12 may have two digits, so they need the Check button.
    if (name !== "Answer digit" && solution.divisor > 10) {
      await practice(page).getByRole("button", { name: /Check/ }).click();
    }
  };

  for (const [i, step] of solution.steps.entries()) {
    if (opts.makeMistake && i === 0 && step.quotientDigit < 9) {
      await answerBox("Answer digit").fill(String(step.quotientDigit + 1));
      await expect(practice(page).getByRole("status")).toContainText("Too big");
      // The visualiser shows why: not enough blocks for every bus to get that many.
      await expect(practice(page).getByText(/won't fit! You'd need/)).toBeVisible();
    }
    await type("Answer digit", step.quotientDigit);
    const isLast = i === solution.steps.length - 1;
    if (step.remainderOut > 0) {
      await type(isLast ? "Final remainder" : "Number carried over", step.remainderOut);
    }
  }
  return solution;
}

/** Close any "Medal unlocked!" pop-ups so the page underneath can be used again. */
async function dismissMedals(page: Page) {
  const dialog = page.getByRole("dialog");
  while (await dialog.isVisible()) {
    await dialog.getByRole("button", { name: "Awesome!" }).click();
  }
}

test("landing page links to Bus Stop Division", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /maths mission/i })).toBeVisible();
  await page.screenshot({ path: `test-results/landing-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("link", { name: /Bus Stop Division/ }).first().click();
  await expect(page.getByRole("heading", { name: "Bus Stop Division", level: 1 })).toBeVisible();
  await expect(page.getByText("Coming soon")).toHaveCount(0);
});

test("favicon, home-screen icons and manifest are served", async ({ page, request }) => {
  await page.goto("/");
  const head = page.locator("head");
  const hrefs = {
    favicon: await head.locator('link[rel="icon"][href^="/favicon.ico"]').getAttribute("href"),
    svg: await head.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href"),
    apple: await head.locator('link[rel="apple-touch-icon"]').getAttribute("href"),
    manifest: await head.locator('link[rel="manifest"]').getAttribute("href"),
  };
  for (const href of Object.values(hrefs)) {
    expect((await request.get(href!)).ok()).toBe(true);
  }
  const manifest = await (await request.get(hrefs.manifest!)).json();
  expect(manifest.short_name).toBe("SumCraft");
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
});

test("'Got it' folds How it works, and the choice survives a reload", async ({ page }) => {
  await page.goto("/topics/bus-stop-division");
  const steps = page.getByText("Let's share 852 between 4 buses");
  const summary = page.getByText("The big number waits under the bus stop");
  const showButton = page.getByRole("button", { name: /Show how it works/ });
  await expect(steps).toBeVisible();
  await expect(summary).toBeVisible();
  await expect(showButton).toBeHidden();
  await page.screenshot({ path: `test-results/intro-open-${test.info().project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: /Got it/ }).click();
  await expect(steps).toBeHidden();
  await expect(summary).toBeHidden();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeHidden();
  await page.reload();
  await expect(showButton).toBeVisible();
  await expect(steps).toBeHidden();
  await page.getByRole("button", { name: "Explorer" }).click();
  await page.screenshot({ path: `test-results/intro-closed-${test.info().project.name}.png`, fullPage: true });

  await showButton.click();
  await expect(steps).toBeVisible();
  await page.reload();
  await expect(steps).toBeVisible();
});

test("sound toggle is remembered across reloads", async ({ page }) => {
  await page.goto("/topics/bus-stop-division");
  const toggle = page.getByRole("button", { name: "Sound" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("Divvy reads messages aloud when sound is on", async ({ page }) => {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    window.speechSynthesis.speak = (u: SpeechSynthesisUtterance) => {
      spoken.push(`${u.lang}|${u.text}`);
    };
  });
  await page.goto("/topics/bus-stop-division");
  await page.getByRole("button", { name: /Warm-up/ }).click();
  const spoken = () => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken);
  await expect.poll(spoken).toEqual([expect.stringMatching(/^en-GB\|Let's go! How many \w+ fit into/)]);

  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("button", { name: /Explorer/ }).click();
  expect(await spoken()).toHaveLength(1);
});

for (const level of ["Warm-up", "Explorer", "Champion", "Legend"]) {
  test(`solve a ${level} problem`, async ({ page }) => {
    await page.goto("/topics/bus-stop-division");
    await page.getByRole("button", { name: new RegExp(level) }).click();
    await page.screenshot({ path: `test-results/${level}-start-${test.info().project.name}.png`, fullPage: true });
    const solution = await solveCurrentProblem(page, { makeMistake: level === "Champion" });
    await expect(practice(page).getByRole("status")).toContainText(
      `${solution.dividend} ÷ ${solution.divisor} = ${solution.quotient}`,
    );
    await expect(practice(page).getByRole("region", { name: "Joke" })).toBeVisible();
    if (level === "Legend") {
      await expect(page.getByRole("dialog")).toContainText("Legend Level Cleared");
    }
    await page.screenshot({ path: `test-results/${level}-done-${test.info().project.name}.png`, fullPage: true });
    await dismissMedals(page);
    await page.getByRole("button", { name: /Next problem/ }).click();
    await expect(page.getByRole("textbox", { name: "Answer digit" })).toBeVisible();
  });
}

test("Watch mode steps through 5432 ÷ 7, forward and back, in sync with the board", async ({ page }) => {
  await page.goto("/topics/bus-stop-division");
  const intro = page.getByRole("region", { name: "How it works" });
  await intro.getByRole("button", { name: "5432 ÷ 7" }).click();
  const narration = intro.getByRole("status");
  const board = intro.getByRole("group", { name: "5432 divided by 7" });
  const forward = intro.getByRole("button", { name: "Step forward" });
  const steps = [
    // Board text reads: answer digits, divisor, then each column's carry and digit.
    { say: "Let's share 5432 between 7 buses", board: "75432" },
    { say: "Share 5 thousands between 7 buses? Not enough for one each, so each bus gets 0.", board: "075432" },
    { say: "5 thousands left over, so swap them for 50 hundreds. Now we have 54 hundreds.", board: "0755432" },
    { say: "Share 54 hundreds between 7 buses: each bus gets 7. (7 × 7 = 49) 5 left over.", board: "07755432" },
    { say: "5 hundreds left over, so swap them for 50 tens. Now we have 53 tens." },
    { say: "Share 53 tens between 7 buses: each bus gets 7." },
    { say: "4 tens left over, so swap them for 40 ones. Now we have 42 ones." },
    { say: "Share 42 ones between 7 buses: each bus gets 6. (7 × 6 = 42) Nothing left over!" },
    { say: "Every bus carries 776. So 5432 ÷ 7 = 776!", board: "077675545342" },
  ];
  for (const [i, step] of steps.entries()) {
    if (i > 0) await forward.click();
    await expect(narration).toContainText(step.say);
    if (step.board) await expect(board).toHaveText(step.board);
    if (i === 3 || i === 4) {
      await page.waitForTimeout(2500); // let the animation settle for the screenshot
      await intro.getByRole("img").screenshot({ path: `test-results/watch-step${i}-${test.info().project.name}.png` });
    }
  }
  await expect(forward).toBeDisabled();
  await intro.getByRole("button", { name: "Step back" }).click();
  await expect(narration).toContainText(steps[7].say);
  await expect(board).toHaveText("077675545342");
});

test("Watch mode plays by itself and can use your own problem", async ({ page }) => {
  await page.goto("/topics/bus-stop-division");
  // Headless Chrome never finishes speaking, so Divvy would wait for the fallback timer.
  await page.getByRole("button", { name: "Sound" }).click();
  const intro = page.getByRole("region", { name: "How it works" });
  await intro.getByRole("button", { name: /My own/ }).click();
  await intro.getByRole("textbox", { name: "Number to share" }).fill("96");
  await intro.getByRole("textbox", { name: "Number of buses" }).fill("4");
  await intro.getByRole("button", { name: /Watch it/ }).click();
  await expect(intro.getByRole("status")).toContainText("Let's share 96 between 4 buses");
  await intro.getByRole("button", { name: "Speed 1 times" }).click();
  await intro.getByRole("button", { name: "Play" }).click();
  await expect(intro.getByRole("status")).toContainText("96 ÷ 4 = 24", { timeout: 30_000 });
  await expect(intro.getByRole("button", { name: "Play" })).toHaveText(/Replay/);
});

test("the visualiser and the board fit on screen together", async ({ page }) => {
  await page.goto("/topics/bus-stop-division");
  await page.getByRole("button", { name: /Got it/ }).click();
  await practice(page).getByRole("button", { name: /Legend/ }).click();
  await page.waitForTimeout(1200); // smooth scroll + blocks popping in
  const viewport = page.viewportSize()!;
  for (const target of [
    practice(page).getByRole("img"),
    practice(page).getByRole("group", { name: /divided by/ }),
    practice(page).getByRole("textbox", { name: "Answer digit" }),
    practice(page).getByRole("button", { name: /Hint/ }),
  ]) {
    const box = (await target.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  }
  expect(await practice(page).getByRole("img").evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(150);

  // A wrong answer is shown in the picture too.
  const label = await practice(page).getByRole("group", { name: /divided by/ }).getAttribute("aria-label");
  const [, dividend, divisor] = label!.match(/(\d+) divided by (\d+)/)!;
  const first = solveBusStop(Number(dividend), Number(divisor)).steps[0];
  const wrong = first.quotientDigit === 9 ? 8 : first.quotientDigit + 1;
  await practice(page).getByRole("textbox", { name: "Answer digit" }).fill(String(wrong));
  await expect(practice(page).getByText(/won't fit!|still waiting/)).toBeVisible();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `test-results/practice-fit-${test.info().project.name}.png` });
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("answers are typed on Divvy's number pad", async ({ page }) => {
    await page.goto("/topics/bus-stop-division");
    await page.getByRole("button", { name: /Got it/ }).click();
    await practice(page).getByRole("button", { name: /Explorer/ }).click();
    const pad = practice(page).getByRole("group", { name: "Number pad" });
    await expect(pad).toBeVisible();
    await expect(practice(page).getByRole("textbox", { name: "Answer digit" })).toHaveAttribute("inputmode", "none");

    const label = await practice(page).getByRole("group", { name: /divided by/ }).getAttribute("aria-label");
    const [, dividend, divisor] = label!.match(/(\d+) divided by (\d+)/)!;
    const first = solveBusStop(Number(dividend), Number(divisor)).steps[0];
    await page.waitForTimeout(1000); // let the workspace finish scrolling into view
    await pad.getByRole("button", { name: String(first.quotientDigit), exact: true }).tap();
    await expect(practice(page).getByRole("status")).toContainText(/Yes!|Spot on/);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `test-results/touch-${test.info().project.name}.png` });

    const viewport = page.viewportSize()!;
    const box = (await pad.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  });
});

test.describe("points, medals and jokes", () => {
  // Five problems in a row takes a while on a slow machine.
  test.slow();

  test("five solves earn points, a streak, Bronze and jokes that don't repeat; progress survives a reload", async ({ page }) => {
    await page.goto("/topics/bus-stop-division");
    await page.getByRole("button", { name: "Sound" }).click();
    const points = page.getByTestId("points");
    await expect(points).toHaveText("0");
    await page.getByRole("button", { name: /Warm-up/ }).click();

    const jokes: string[] = [];
    for (let i = 1; i <= 5; i++) {
      await solveCurrentProblem(page);
      await expect(practice(page).getByRole("status")).toContainText("points!");
      const joke = practice(page).getByRole("region", { name: "Joke" });
      jokes.push((await joke.locator("p").first().textContent())!);
      if (i === 1) {
        await joke.getByRole("button", { name: /reveal the punchline/ }).click();
        await expect(joke.getByRole("button")).toHaveCount(0);
        await expect(joke.locator("p")).toHaveCount(2);
      }
      if (i === 5) {
        const dialog = page.getByRole("dialog");
        await expect(dialog).toContainText("Bus Stop Bronze");
        await page.screenshot({ path: `test-results/medal-${test.info().project.name}.png` });
        await dismissMedals(page);
      }
      await page.getByRole("button", { name: /Next problem/ }).click();
    }
    expect(new Set(jokes).size).toBe(5);
    // Warm-up with no hints or mistakes: 15 + 15 + 23 + 23 + 30.
    await expect(points).toHaveText("106", { timeout: 5000 });
    await expect(page.getByRole("link", { name: /5 in a row/ })).toBeVisible();

    await page.reload();
    await expect(points).toHaveText("106");

    await page.getByRole("link", { name: /trophies/ }).click();
    await expect(page.getByRole("heading", { name: /Trophy Cabinet/ })).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Bus Stop Bronze: earned/ })).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Streak Star: earned/ })).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Bus Stop Silver: locked/ })).toContainText("5 / 15");
    await page.screenshot({ path: `test-results/trophies-${test.info().project.name}.png`, fullPage: true });

    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.getByRole("button", { name: "No, keep it" }).click();
    await expect(points).toHaveText("106");
    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.getByRole("button", { name: "Yes, reset" }).click();
    await expect(points).toHaveText("0");
    await expect(page.getByRole("listitem", { name: /Bus Stop Bronze: locked/ })).toBeVisible();
    await page.reload();
    await expect(points).toHaveText("0");
  });

  test("siblings can each have their own profile", async ({ page }) => {
    await page.goto("/topics/bus-stop-division");
    await page.getByRole("button", { name: "Sound" }).click();
    await page.getByRole("button", { name: /Warm-up/ }).click();
    await solveCurrentProblem(page);
    const points = page.getByTestId("points");
    await expect(points).toHaveText("15");

    await page.goto("/trophies");
    await page.getByRole("textbox", { name: /Nickname/ }).fill("Ada");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("link", { name: /Ada's trophies/ })).toBeVisible();

    await page.getByRole("button", { name: "+ Add player" }).click();
    await page.getByRole("textbox", { name: /New player/ }).fill("Alan");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("button", { name: /^Alan ·/ })).toHaveAttribute("aria-pressed", "true");
    await expect(points).toHaveText("0");

    await page.reload();
    await expect(page.getByRole("button", { name: /^Alan ·/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^Ada ·/ }).click();
    await expect(points).toHaveText("15");

    await page.getByRole("button", { name: /^Alan ·/ }).click();
    await page.getByRole("button", { name: "Remove Alan" }).click();
    await page.getByRole("button", { name: "Yes, remove" }).click();
    await expect(page.getByRole("button", { name: /^Alan ·/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Ada ·/ })).toHaveAttribute("aria-pressed", "true");
  });
});
