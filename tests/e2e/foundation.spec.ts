import { test, expect } from "@playwright/test";

test("visitor can browse, filter, and navigate without overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Good work deserves to be discovered." }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("link", { name: "Explore projects" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole("link", { name: "Latest", exact: true }).click();
  await expect(page).toHaveURL(/tab=latest/);
  await page.getByLabel("Category", { exact: true }).selectOption("developer-tools");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=developer-tools/);
  await page.locator(".filter-area").getByRole("link", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("link", { name: "ARK home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Good work deserves to be discovered." })).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
});
test("private routes gate visitors and explain OAuth availability", async ({ page }) => {
  await page.goto("/publish");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Made something? Make it known." })).toBeVisible();
  await expect(page.locator(".sidebar, .mobile-header, .topbar")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "ARK home" })).toHaveAttribute("href", "/");
  if (await page.getByText(/OAuth is ready to connect|sign-in need to be enabled/).isVisible()) {
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
  }
});
test("search uses the URL and renders results or setup state", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("textbox", { name: "Search projects or makers" }).fill("my project");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=my\+project/);
  await expect(
    page
      .getByRole("heading", { name: "Search is ready to connect." })
      .or(page.getByRole("heading", { name: "Projects", exact: true })),
  ).toBeVisible();
});
test("dark mode preserves the app and keyboard navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/explore");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    "rgb(10, 10, 10)",
  );
});
