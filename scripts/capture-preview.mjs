import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const output = path.resolve("test-results/preview");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
try {
  for (const [name, width, height, colorScheme] of [
    ["desktop", 1440, 1000, "light"],
    ["mobile", 360, 800, "light"],
    ["dark", 1440, 1000, "dark"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme });
    await page.goto("http://127.0.0.1:3000/explore");
    await page.getByRole("heading", { name: "Popular projects", exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
      throw new Error(`${name}: horizontal overflow`);
    await page.close();
  }
  console.log(`Preview screenshots saved to ${output}`);
} finally {
  await browser.close();
}
