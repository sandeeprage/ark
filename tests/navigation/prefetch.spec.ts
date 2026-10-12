import { test, expect } from "@playwright/test";

test("production navigation prefetches and opens the correct account page", async ({
  page,
  request,
}) => {
  await request.post("http://127.0.0.1:55431/__reset");
  await page.goto("/login?next=%2Fpublish");
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(page).toHaveURL(/\/publish$/);

  const navigation = await page.context().newPage();
  const settingsReady = navigation.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/settings" &&
      response.request().headers()["next-router-prefetch"] === "1" &&
      response.status() === 200,
  );
  // A fresh navigation ensures this checks the production router's prefetch
  // rather than data retained from the OAuth journey.
  await navigation.goto("/explore");
  await settingsReady;
  await navigation.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(navigation.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(navigation.getByText("Loading your next discovery…", { exact: true })).toHaveCount(
    0,
  );
  await expect(navigation.getByRole("textbox", { name: "Display name" })).toHaveValue(
    "Fixture maker",
  );
});
