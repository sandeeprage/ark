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
test("votes reconcile, failures roll back, and changed pages append without duplicates", async ({
  page,
  request,
}) => {
  await page.goto("/explore");
  await expect(page.locator("article.project-card,article.project-row")).toHaveCount(20);
  const first = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Discovery project 01", exact: true }) });
  await first.getByRole("button", { name: "Upvote · 0 upvotes", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "Remove upvote · 1 upvotes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    first.getByRole("button", { name: "Remove upvote · 1 upvotes", exact: true }),
  ).toBeEnabled();
  await request.post("http://127.0.0.1:55431/__fail_vote");
  await first.getByRole("button", { name: "Remove upvote · 1 upvotes", exact: true }).click();
  await expect(first.getByRole("alert")).toContainText("active, eligible");
  await expect(
    first.getByRole("button", { name: "Remove upvote · 1 upvotes", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await first.getByRole("button", { name: "Remove upvote · 1 upvotes", exact: true }).click();
  await expect(
    first.getByRole("button", { name: "Upvote · 0 upvotes", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(/\/explore$/);
  await request.post("http://127.0.0.1:55431/__shift_discovery");
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.locator("article.project-card,article.project-row")).toHaveCount(25);
  await expect(
    page.getByRole("heading", { name: "Discovery project 01", exact: true }),
  ).toHaveCount(1);
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.locator("article.project-card,article.project-row")).toHaveCount(20);
  await expect(
    page.getByRole("heading", { name: "Discovery project 01", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Latest", exact: true }).click();
  await expect(page).toHaveURL(/tab=latest/);
  await expect(page.getByRole("heading", { name: "Latest launches", exact: true })).toBeVisible();
});
test("anonymous upvote links preserve the project destination and feed data is uncached", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto("/explore");
  const response = await page.request.get("/api/discovery/projects");
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  await page
    .getByRole("link", { name: "Sign in to upvote · 0 upvotes", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects%2F10000000-0000-4000-a000-000000000001/);
});
