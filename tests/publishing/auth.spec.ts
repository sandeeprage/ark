import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:55431/__reset");
});
test("OAuth exchanges browser verifier and preserves the destination without provider tokens", async ({
  page,
  context,
}) => {
  await page.goto("/login?next=%2Fpublish");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/publish$/);
  await expect(page.getByRole("heading", { name: "Give your work a home." })).toBeVisible();
  const cookies = await context.cookies();
  const auth = cookies
    .filter((c) => /^sb-127-auth-token(?:\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  const session = JSON.parse(Buffer.from(auth.replace(/^base64-/, ""), "base64url").toString());
  expect(session.access_token).toBeTruthy();
  expect(session.provider_token).toBeUndefined();
  expect(session.provider_refresh_token).toBeUndefined();
  await page.goto("/login?next=%2Fsettings");
  await expect(page).toHaveURL(/\/settings$/);
  await page.reload();
  await expect(page).toHaveURL(/\/settings$/);
});
test("alternate host moves to the canonical login before OAuth starts", async ({ page }) => {
  await page.goto("http://localhost:3001/login?next=%2Fpublish");
  await expect(page).toHaveURL("http://127.0.0.1:3001/login?next=%2Fpublish");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3001/publish");
});
test("missing verifier produces actionable error and preserves the retry destination", async ({
  page,
}) => {
  await page.goto("/auth/callback?code=fixture-expired-code&next=%2Fsettings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings&error=browser$/);
  await expect(page.locator(".notice-error")).toContainText("another browser or domain");
});
test("cancelled consent and encoded search returns are retained", async ({ page }) => {
  await page.goto(
    "/auth/callback?error=access_denied&next=" + encodeURIComponent("/search?q=hello%20world"),
  );
  await expect(page.locator(".notice-error")).toContainText("cancelled");
  await expect(page.locator('input[name="next"]')).toHaveValue("/search?q=hello%20world");
});
test("profile failure clears issued cookies and shows a recoverable error", async ({
  page,
  context,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__auth_mode", { data: { mode: "profile_error" } });
  await page.goto("/login?next=%2Fpublish");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page.locator(".notice-error")).toContainText("profile could not be loaded");
  expect(
    (await context.cookies()).filter((c) => c.name.startsWith("sb-127-auth-token")),
  ).toHaveLength(0);
});
test("new maker callback preserves the destination through onboarding", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__auth_mode", { data: { mode: "onboarding" } });
  await page.goto("/login?next=%2Fsettings");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\?next=%2Fsettings$/);
  await expect(page.locator(".topbar")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Let’s meet the maker." })).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue("/settings");
});
test("restricted account reaches its notice and can sign out locally", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__auth_mode", { data: { mode: "suspended" } });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your account is restricted." })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
});
test("local sign-out clears cookies during a provider outage", async ({
  page,
  request,
  context,
}) => {
  await page.goto("/login?next=%2Fsettings");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await request.post("http://127.0.0.1:55431/__auth_mode", { data: { mode: "logout_error" } });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  expect(
    (await context.cookies()).filter((c) => c.name.startsWith("sb-127-auth-token")),
  ).toHaveLength(0);
});
