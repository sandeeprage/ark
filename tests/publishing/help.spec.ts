import { test, expect } from "@playwright/test";

test("support pages and footer links work with a keyboard at narrow widths", async ({
  page,
}, testInfo) => {
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Help with ARK", exact: true })).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "arkragesupport@gmail.com", exact: true }),
  ).toHaveAttribute("href", "mailto:arkragesupport@gmail.com");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy on ARK", exact: true })).toBeVisible();
  await footer.getByRole("link", { name: "Terms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Using ARK", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("terms.png"), fullPage: true });
  await page.goto("/status");
  await expect(
    page.getByRole("heading", { name: "Service information", exact: true }),
  ).toBeVisible();
});
