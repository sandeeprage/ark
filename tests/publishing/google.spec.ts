import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:55431/__reset");
});
test("Google sign-in preserves the requested page through onboarding", async ({
  page,
  request,
  context,
}) => {
  await request.post("http://127.0.0.1:55431/__google_mode", { data: { onboarding: true } });
  await page.goto("/login?next=%2Fcollections");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\?next=%2Fcollections$/);
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "Google fixture maker",
  );
  await expect(page.getByText(/Connected as @/)).toHaveCount(0);
  await page.locator('input[name="username"]').fill("google_maker");
  await page.getByRole("button", { name: "Create my profile", exact: true }).click();
  await expect(page).toHaveURL(/\/collections$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Collections", exact: true })).toBeVisible();
  const raw = (await context.cookies())
    .filter((c) => /^sb-127-auth-token(?:\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join("");
  const session = JSON.parse(Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString());
  expect(session).not.toHaveProperty("provider_token");
});
