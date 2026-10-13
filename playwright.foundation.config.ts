import { defineConfig } from "@playwright/test";
import publishing from "./playwright.publishing.config";

// Foundation checks use the same disposable backend; no production reads or writes.
export default defineConfig({ ...publishing, testDir: "./tests/e2e" });
