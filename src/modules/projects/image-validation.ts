import sharp from "sharp";
import { MAX_IMAGE_BYTES, imageTypes } from "./validation";

export async function sanitizeScreenshot(bytes: Buffer, declaredType: string) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    throw new Error("Screenshots must be no larger than 5 MiB.");
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const format = png ? "png" : jpeg ? "jpeg" : webp ? "webp" : null;
  if (
    !format ||
    !imageTypes.includes(declaredType as (typeof imageTypes)[number]) ||
    declaredType !== `image/${format}`
  )
    throw new Error("Choose a genuine PNG, JPEG, or WebP image.");
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: 4096 * 4096,
      failOn: "warning",
      animated: false,
    });
    const metadata = await decoder.metadata();
    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      metadata.height > 4096 ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Screenshots must be static images no larger than 4096 × 4096 pixels.");
    // Re-encoding strips EXIF and other metadata. Do not use keepMetadata().
    const { data, info } = await decoder
      .rotate()
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MAX_IMAGE_BYTES) throw new Error("The processed screenshot exceeds 5 MiB.");
    return {
      bytes: data,
      mime_type: "image/webp" as const,
      width: info.width,
      height: info.height,
      size_bytes: data.length,
    };
  } catch (error) {
    if (error instanceof Error && /Screenshots|processed/.test(error.message)) throw error;
    throw new Error("This image couldn’t be decoded. Choose a different screenshot.");
  }
}
