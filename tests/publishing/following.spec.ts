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

test("follow, feed membership, public lists and failure recovery", async ({ page, request }) => {
  await page.goto("/following");
  await expect(page.getByRole("heading", { name: "Find your people.", exact: true })).toBeVisible();
  await page.goto("/makers/other_maker");
  await page.getByRole("button", { name: "Follow", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unfollow", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: "1 followers", exact: true })).toBeVisible();
  await request.post("http://127.0.0.1:55431/__fail_follow");
  await page.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(page.locator(".follow-control").getByRole("alert")).toContainText("active account");
  await expect(page.getByRole("button", { name: "Unfollow", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/following");
  await expect(page.locator("article.project-card,article.project-row")).toHaveCount(20);
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.locator("article.project-card,article.project-row")).toHaveCount(25);
  await page.goto("/makers/other_maker/followers");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Fixture maker @fixture_maker", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/makers/other_maker");
  await page.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(page.getByRole("button", { name: "Follow", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.goto("/following");
  await expect(page.getByRole("heading", { name: "Find your people.", exact: true })).toBeVisible();
});
test("anonymous following is gated and public profile preserves login destination", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.goto("/following");
  await expect(page).toHaveURL(/login\?next=%2Ffollowing/);
  const response = await page.request.get("/api/discovery/projects?tab=following");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  await page.goto("/makers/other_maker");
  await page.getByRole("link", { name: "Sign in to follow", exact: true }).click();
  await expect(page).toHaveURL(/next=%2Fmakers%2Fother_maker/);
});
