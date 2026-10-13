import { test, expect } from "@playwright/test";

test("account card opens the profile and keeps profile editing available", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__reset");
  await page.goto("/login?next=%2Fpublish");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/publish$/);

  const navigation = await page.context().newPage();
  await navigation.goto("/explore");
  await expect(navigation.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  await expect(navigation.getByRole("link", { name: "Settings", exact: true })).toHaveCount(0);
  await navigation.locator(".account-summary").click();
  await expect(navigation).toHaveURL(/\/makers\/fixture_maker$/);
  await navigation.getByRole("link", { name: "Edit profile" }).click();
  await expect(navigation.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(navigation.getByText("Loading your next discovery…", { exact: true })).toHaveCount(
    0,
  );
  await expect(navigation.getByRole("textbox", { name: "Display name" })).toHaveValue(
    "Fixture maker",
  );
  const home = await navigation.goto("/");
  expect(home?.headers()["cache-control"]).toContain("no-store");
  const landingNavigation = navigation.getByRole("navigation", { name: "Landing navigation" });
  await expect(landingNavigation.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  await expect(landingNavigation.getByRole("link", { name: "Your profile" })).toHaveAttribute(
    "href",
    "/makers/fixture_maker",
  );
  await navigation.reload();
  await expect(landingNavigation.getByRole("link", { name: "Your profile" })).toBeVisible();
  await navigation.goto("/settings");
  await navigation.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(navigation).toHaveURL(/\/explore$/);
  await navigation.goto("/");
  await expect(landingNavigation.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(landingNavigation.getByRole("link", { name: "Your profile" })).toHaveCount(0);
});
