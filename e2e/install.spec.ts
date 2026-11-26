import { expect, test, type Page } from "@playwright/test";

// A touch screen, so the page treats us as a phone or tablet.
test.use({ hasTouch: true, isMobile: true });

/**
 * Pretend to be Android Chrome offering to install the app. Records whether our page
 * opened the browser's install sheet, and answers it with `outcome`.
 */
async function offerInstall(page: Page, outcome: "accepted" | "dismissed") {
  await page.evaluate((outcome) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        (window as unknown as { installSheetOpened: boolean }).installSheetOpened = true;
        if (outcome === "accepted") setTimeout(() => window.dispatchEvent(new Event("appinstalled")));
      },
      userChoice: Promise.resolve({ outcome }),
    });
    window.dispatchEvent(event);
  }, outcome);
}

const installSheetOpened = (page: Page) =>
  page.evaluate(() => (window as unknown as { installSheetOpened?: boolean }).installSheetOpened === true);

const askDialog = (page: Page) => page.getByRole("dialog", { name: /Add SumCraft to your home screen/ });
const headerInstall = (page: Page) => page.getByRole("button", { name: "Install SumCraft" });

test("saying yes opens the browser's install sheet and the offer goes away", async ({ page }) => {
  await page.goto("/");
  await offerInstall(page, "accepted");

  await askDialog(page).getByRole("button", { name: /Yes/ }).click();
  expect(await installSheetOpened(page)).toBe(true);
  await expect(askDialog(page)).toBeHidden();
  await expect(headerInstall(page)).toBeHidden();
});

test("saying no is remembered, leaving a small install button in the header", async ({ page }) => {
  await page.goto("/");
  await offerInstall(page, "dismissed");

  await expect(headerInstall(page)).toBeHidden();
  await askDialog(page).getByRole("button", { name: "No thanks" }).click();
  await expect(askDialog(page)).toBeHidden();
  await expect(headerInstall(page)).toBeVisible();

  // Next visit: no question, just the button.
  await page.reload();
  await offerInstall(page, "dismissed");
  await expect(headerInstall(page)).toBeVisible();
  await page.waitForTimeout(3500); // longer than the delay before asking
  await expect(askDialog(page)).toBeHidden();

  // Changed their mind: the button opens the browser's install sheet.
  await headerInstall(page).click();
  expect(await installSheetOpened(page)).toBe(true);
});

test("without an install offer from the browser, the header button explains how", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("sumcraft:install-asked", "true"));
  await page.reload();

  await headerInstall(page).click();
  const help = page.getByRole("dialog", { name: /Add SumCraft in two taps/ });
  await expect(help).toContainText("Add to Home screen");
  await help.getByRole("button", { name: "Got it!" }).click();
  await expect(help).toBeHidden();
});
