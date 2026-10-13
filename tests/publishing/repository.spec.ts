import { test, expect } from "@playwright/test";
const fixture = "http://127.0.0.1:55431";
const project = "/projects/10000000-0000-4000-a000-000000000001";
test.beforeEach(async ({ request, page }) => {
  await request.post(fixture + "/__reset");
  await request.post(fixture + "/__repository_project", { data: { state: "expired" } });
  await page.goto("/login?next=" + encodeURIComponent(project));
  await page.getByRole("button", { name: "Continue with GitHub", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Repository fixture", exact: true }),
  ).toBeVisible();
});
test("owner rechecks an expired claim and a provider failure removes the claim without removing the project", async ({
  page,
  request,
}) => {
  await expect(page.getByText("The previous check expired.", { exact: false })).toBeVisible();
  await expect(page.getByText(/^Repository owner verified/)).toHaveCount(0);
  await page.route("**/verify-repository", async (route) => {
    await request.post(fixture + "/__repository_project", { data: { state: "verified" } });
    await route.fulfill({ json: { state: "verified" } });
  });
  await page.getByRole("button", { name: "Recheck ownership", exact: true }).click();
  await expect(page.getByText(/^Repository owner verified/)).toBeVisible();
  await page.getByText("What does ownership verification mean?", { exact: true }).click();
  await expect(page.getByText(/It does not establish authorship/)).toBeVisible();
  await page.unroute("**/verify-repository");
  await page.route("**/verify-repository", async (route) => {
    await request.post(fixture + "/__repository_project", { data: {} });
    await route.fulfill({
      status: 503,
      json: {
        error:
          "GitHub is temporarily unavailable. Your project remains published; try the check again later.",
      },
    });
  });
  await page.getByRole("button", { name: "Recheck ownership", exact: true }).click();
  await expect(page.locator(".repository-verification").getByRole("alert")).toContainText(
    "GitHub is temporarily unavailable",
  );
  await expect(page.getByText(/^Repository owner verified/)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Repository fixture", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check repository ownership", exact: true }),
  ).toBeEnabled();
});

test("public visitors see the dated ownership claim but cannot request checks", async ({
  page,
  request,
  context,
}) => {
  await request.post(fixture + "/__repository_project", { data: { state: "verified" } });
  await context.clearCookies();
  await page.goto(project);
  await expect(page.getByText(/^Repository owner verified/)).toBeVisible();
  await expect(page.getByRole("button", { name: /ownership/ })).toHaveCount(0);
  await request.post(fixture + "/__repository_project", { data: { state: "expired" } });
  await page.reload();
  await expect(page.getByText(/^Repository owner verified/)).toHaveCount(0);
});
