import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeScreenshot } from "@/modules/projects/image-validation";

describe("screenshot sanitization", () => {
  it("decodes and re-encodes a genuine image, removing metadata", async () => {
    const input = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#171717" },
    })
      .withMetadata({ orientation: 1 })
      .png()
      .toBuffer();
    const output = await sanitizeScreenshot(input, "image/png");
    const metadata = await sharp(output.bytes).metadata();
    expect(output.width).toBe(80);
    expect(output.height).toBe(60);
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
  });
  it("rejects executable SVG and MIME spoofing", async () => {
    await expect(
      sanitizeScreenshot(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
        "image/png",
      ),
    ).rejects.toThrow("genuine");
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
      .png()
      .toBuffer();
    await expect(sanitizeScreenshot(png, "image/jpeg")).rejects.toThrow("genuine");
  });
  it("rejects decoded dimension bombs and corrupt images", async () => {
    const wide = await sharp({
      create: { width: 4097, height: 1, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    await expect(sanitizeScreenshot(wide, "image/png")).rejects.toThrow("4096");
    await expect(
      sanitizeScreenshot(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]), "image/png"),
    ).rejects.toThrow("decoded");
  });
});
