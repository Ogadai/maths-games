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
});

for (const level of ["Warm-up", "Explorer", "Champion", "Legend"]) {
  test(`solve a ${level} problem`, async ({ page }) => {
    await page.goto("/topics/bus-stop-division");
    await page.getByRole("button", { name: new RegExp(level) }).click();
    await page.getByRole("button", { name: /Give me a problem/ }).click();
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
