import { test, expect } from "@playwright/test";
import sharp from "sharp";

test.beforeEach(async ({ context, request }) => {
  await request.post("http://127.0.0.1:55431/__reset");
  const expires = Math.floor(Date.now() / 1000) + 3600,
    id = "00000000-0000-4000-a000-000000000001";
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, exp: expires, role: "authenticated" },
    "fixture-signature",
  ]
    .map((part) =>
      Buffer.from(typeof part === "string" ? part : JSON.stringify(part)).toString("base64url"),
    )
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

test("maker publishes validated images, edits, pins, and deletes", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/publish");
  await expect(page.getByRole("heading", { name: "Give your work a home." })).toBeVisible();
  await page.getByLabel("Project name", { exact: true }).fill("Fixture toolkit");
  await page.getByLabel(/^Tagline/).fill("A complete toolkit for this isolated browser test");
  await page
    .getByLabel(/^Description/)
    .fill(
      "A local testing fixture that exercises the real publishing UI, server image validation, and storage request flow. It is never added to the connected Supabase project.",
    );
  await page.getByRole("combobox", { name: "Project type", exact: true }).selectOption("software");
  await page.getByLabel(/Public release or package/).fill("https://example.test/fixture-toolkit");
  await page.getByLabel(/^Primary category/).selectOption("20000000-0000-4000-a000-000000000001");
  await page.getByRole("checkbox", { name: "TypeScript", exact: true }).check();
  const png = await sharp({ create: { width: 80, height: 60, channels: 3, background: "#171717" } })
    .withMetadata()
    .png()
    .toBuffer();
  await page.getByLabel("Upload screenshots").setInputFiles([
    { name: "main.png", mimeType: "image/png", buffer: png },
    { name: "second.png", mimeType: "image/png", buffer: png },
  ]);
  await page
    .getByLabel("Screenshot 1 description", { exact: true })
    .fill("The main toolkit screen");
  await page
    .getByLabel("Screenshot 2 description", { exact: true })
    .fill("A second toolkit screen");
  await page.getByRole("button", { name: "Move screenshot 2 up" }).click();
  await page.getByRole("checkbox", { name: /I confirm this project/ }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("publishing-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Publish project", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/10000000-0000-4000-a000-000000000001$/);
  await expect(page.getByRole("heading", { name: "Fixture toolkit", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upvote · 0 upvotes", exact: true }),
  ).toBeDisabled();
  const state = await (await request.get("http://127.0.0.1:55431/__state")).json();
  expect(state.processedImages).toHaveLength(2);
  expect(state.media[0].alt_text).toBe("A second toolkit screen");
  expect(state.assetStates).toEqual(["consumed", "consumed"]);
  await page.getByRole("button", { name: "Pin on profile" }).click();
  await expect(page.getByRole("button", { name: "Unpin", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Updated fixture toolkit");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated fixture toolkit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name", { exact: true }).fill("Updated fixture toolkit");
  await dialog.getByRole("button", { name: "Delete project", exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  expect((await (await request.get("http://127.0.0.1:55431/__state")).json()).project.status).toBe(
    "deleted",
  );
});
