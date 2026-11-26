import { expect, test, type Page } from "@playwright/test";
import { solveBusStop } from "../src/lib/maths/busStop";

async function solveCurrentProblem(page: Page, opts: { makeMistake?: boolean } = {}) {
  const label = await page.getByRole("group", { name: /divided by/ }).last().getAttribute("aria-label");
  const [, dividend, divisor] = label!.match(/(\d+) divided by (\d+)/)!;
  const solution = solveBusStop(Number(dividend), Number(divisor));
  const answerBox = (name: string) => page.getByRole("textbox", { name });
  const type = async (name: string, value: number) => {
    const box = answerBox(name);
    await box.fill(String(value));
    // Leftovers for divisors 11 and 12 may have two digits, so they need the Check button.
    if (name !== "Answer digit" && solution.divisor > 10) {
      await page.getByRole("button", { name: /Check/ }).click();
    }
  };

  for (const [i, step] of solution.steps.entries()) {
    if (opts.makeMistake && i === 0 && step.quotientDigit < 9) {
      await answerBox("Answer digit").fill(String(step.quotientDigit + 1));
      await expect(page.getByRole("status")).toContainText("Too big");
    }
    await type("Answer digit", step.quotientDigit);
    const isLast = i === solution.steps.length - 1;
    if (step.remainderOut > 0) {
      await type(isLast ? "Final remainder" : "Number carried over", step.remainderOut);
    }
  }
  return solution;
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
  const steps = page.getByText("How many 4s fit into 8?");
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
    await expect(page.getByRole("status")).toContainText(
      `${solution.dividend} ÷ ${solution.divisor} = ${solution.quotient}`,
    );
    await page.screenshot({ path: `test-results/${level}-done-${test.info().project.name}.png`, fullPage: true });
    await page.getByRole("button", { name: /Next problem/ }).click();
    await expect(page.getByRole("textbox", { name: "Answer digit" })).toBeVisible();
  });
}
