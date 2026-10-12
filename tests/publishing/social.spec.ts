import { test, expect } from "@playwright/test";
test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:55431/__reset");
  await request.post("http://127.0.0.1:55431/__seed_discovery");
  const id = "00000000-0000-4000-a000-000000000001",
    expires = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, exp: expires, role: "authenticated" },
    "fixture-signature",
  ]
    .map((p) => Buffer.from(typeof p === "string" ? p : JSON.stringify(p)).toString("base64url"))
    .join(".");
  const session = {
    access_token: jwt,
    refresh_token: "fixture-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expires,
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "github" },
      user_metadata: {},
      created_at: "2026-10-12T00:00:00Z",
    },
  };
  await context.addCookies([
    {
      name: "sb-127-auth-token",
      value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"),
      url: "http://127.0.0.1:3001",
    },
  ]);
});

test("public saving, multiple memberships, CRUD and error recovery", async ({
  page,
  request,
  context,
}) => {
  await page.goto("/explore");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Discovery project 01", exact: true }) });
  await card.getByRole("button", { name: "Save project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Public collection — anyone can view this.");
  await dialog.getByRole("checkbox", { name: /Saved/ }).check();
  await expect(dialog.getByRole("checkbox", { name: "Saved", exact: true })).toBeChecked();
  await dialog.getByLabel("New public collection").fill("Tools");
  await dialog.getByRole("button", { name: "Create collection", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Tools", exact: true }).check();
  await expect(dialog.getByRole("checkbox", { name: "Tools", exact: true })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Tools", exact: true })).toBeEnabled();
  await request.post("http://127.0.0.1:55431/__fail_save");
  await dialog.getByRole("checkbox", { name: "Tools", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("active account");
  await expect(dialog.getByRole("checkbox", { name: "Tools", exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "Close collections", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Manage saved project", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/collections");
  const editor = page
    .locator("article.collection-editor")
    .filter({ has: page.getByRole("heading", { name: "Tools", exact: true }) });
  await editor.getByLabel("Title", { exact: true }).fill("Useful tools");
  await editor.getByLabel("Description").fill("Projects worth keeping.");
  await editor.getByRole("button", { name: "Save collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Useful tools", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Useful tools", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Discovery project 01", exact: true }),
  ).toBeVisible();
  const publicUrl = page.url();
  await context.clearCookies();
  await page.reload();
  await expect(page).toHaveURL(publicUrl);
  await expect(
    page.getByRole("heading", { name: "Discovery project 01", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("notifications paginate, mark read, mark all and preference persistence", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__seed_notices");
  await page.goto("/notifications");
  await expect(page.locator(".notification-list li")).toHaveCount(20);
  await expect(page.getByText("25 unread", { exact: true })).toBeVisible();
  await page
    .locator(".notification-list li")
    .first()
    .getByRole("button", { name: "Mark read", exact: true })
    .click();
  await expect(page.getByText("24 unread", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Load more", exact: true }).click();
  await expect(page.locator(".notification-list li")).toHaveCount(5);
  await page.getByRole("button", { name: "Mark all read", exact: true }).click();
  await expect(page.getByText("0 unread", { exact: true })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Someone follows me", exact: true }).uncheck();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved.");
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Someone follows me", exact: true }),
  ).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
