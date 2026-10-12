import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/navigation",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    ...devices["Desktop Chrome"],
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: [
    {
      command: "node tests/fixtures/publishing-backend.mjs",
      url: "http://127.0.0.1:55431/__health",
      reuseExistingServer: false,
    },
    {
      command: "npm run build && npm run start -- --port 3001",
      url: "http://127.0.0.1:3001",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55431",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
        SUPABASE_SECRET_KEY: "fixture-server-only",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3001",
        ARK_TEST_DIST_DIR: ".next-production-checks",
      },
    },
  ],
});
