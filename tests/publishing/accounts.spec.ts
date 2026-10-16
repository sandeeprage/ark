import { test, expect } from "@playwright/test";
import sharp from "sharp";
test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:55431/__reset");
  await page.goto("/login?next=%2Fsettings");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
test("profile saves acknowledge changes, reject unchanged submissions, and expose avatar upload", async ({
  page,
}, testInfo) => {
  await expect(page.getByRole("button", { name: "Save profile", exact: true })).toBeDisabled();
  await page.getByLabel("Display name", { exact: true }).fill("Updated fixture maker");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByText("Profile saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save profile", exact: true })).toBeDisabled();
  const image = await sharp({
    create: { width: 64, height: 48, channels: 3, background: "#171717" },
  })
    .withMetadata()
    .png()
    .toBuffer();
  await page
    .getByLabel("Profile photo", { exact: true })
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: image });
  await page.getByRole("button", { name: "Save avatar", exact: true }).click();
  await expect(page.getByText("Avatar saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save avatar", exact: true })).toBeDisabled();
  await expect
    .poll(async () =>
      page
        .locator(".avatar-form img")
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 512),
    )
    .toBe(true);
  await page.goto("/makers");
  const makerPhoto = page.locator(".maker-directory-card .avatar img");
  await expect(makerPhoto).toHaveCount(1);
  await expect.poll(() => makerPhoto.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 512)).toBe(true);
  await page.goto("/search?q=fixture");
  await expect(page.locator(".maker-result .avatar img")).toHaveCount(1);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Remove avatar", exact: true }).click();
  await expect(page.getByText("Avatar removed.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("settings.png"), fullPage: true });
});
test("a confirmed disconnect preserves the other usable identity", async ({ page, request }) => {
  await request.post("http://127.0.0.1:55431/__account_mode", { data: { both: true } });
  await page.reload();
  await page.getByRole("button", { name: "Disconnect GitHub", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Disconnect account", exact: true })
    .click();
  await expect(page.getByText("Account disconnected.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Disconnect Google", exact: true })).toBeDisabled();
});

test("connecting Google returns to the same account settings", async ({ page }) => {
  await page.getByRole("button", { name: "Connect Google", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("button", { name: "Disconnect Google", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Disconnect GitHub", exact: true })).toBeEnabled();
});
test("expired sign-in gates sensitive changes, while confirmed fresh erasure signs out", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__account_mode", { data: { expired: true } });
  await page.reload();
  await expect(page.getByRole("button", { name: "Delete my account", exact: true })).toBeDisabled();
  await request.post("http://127.0.0.1:55431/__account_mode", { data: { expired: false } });
  await page.reload();
  await page.getByRole("button", { name: "Delete my account", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Permanently delete account", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("ARK username", { exact: true }).fill("fixture_maker");
  await dialog.getByRole("button", { name: "Permanently delete account", exact: true }).click();
  await expect(page).toHaveURL(/\/account-deleted$/);
  await expect(page.getByRole("heading", { name: "Account deletion requested." })).toBeVisible();
});
test("reports are private and admin decisions are acknowledged", async ({ page, request }) => {
  await request.post("http://127.0.0.1:55431/__seed_discovery");
  await page.goto("/explore");
  await page.getByRole("link", { name: "View Discovery project 01", exact: true }).click();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("This fixture concern exists only in isolated tests.");
  await dialog.getByRole("button", { name: "Submit report", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Report submitted");
  await dialog.getByRole("button", { name: "Close report", exact: true }).click();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Moderation", exact: true })).toHaveCount(0);
  await request.post("http://127.0.0.1:55431/__account_mode", { data: { admin: true } });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Moderation", exact: true })).toBeVisible();
  await page
    .getByLabel("Decision reason", { exact: true })
    .fill("Reviewed the isolated fixture and dismissed the concern.");
  await page.getByRole("button", { name: "Save decision", exact: true }).click();
  await expect(
    page.getByText("Decision saved and recorded in the moderation audit.", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
