import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 8;
export const imageTypes = ["image/png", "image/jpeg", "image/webp"] as const;

export function normalizeUrl(value: string, github = false): string {
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes("."))
    throw new Error("Use a public HTTPS URL without credentials.");
  url.hash = "";
  if (github) {
    if (
      url.hostname !== "github.com" ||
      url.port ||
      !/^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/.test(url.pathname)
    )
      throw new Error("Use a GitHub owner/repository URL.");
    return `https://github.com${url.pathname
      .replace(/\/$/, "")
      .replace(/\.git$/i, "")
      .toLowerCase()}`;
  }
  return url.origin + url.pathname.replace(/\/+$/, "") + url.search;
}

const optionalUrl = (github = false) =>
  z
    .string()
    .trim()
    .max(2000)
    .transform((value, ctx) => {
      if (!value) return null;
      try {
        return normalizeUrl(value, github);
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Enter a valid URL.",
        });
        return z.NEVER;
      }
    });

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    tagline: z.string().trim().min(10).max(160),
    description: z
      .string()
      .trim()
      .min(100, "Tell people about your project in at least 100 characters.")
      .max(10000),
    launch_kind: z.enum(["hosted", "software"]),
    live_url: optionalUrl(),
    github_url: optionalUrl(true),
    release_url: optionalUrl(),
    demo_video_url: optionalUrl().refine(
      (value) =>
        !value ||
        ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "www.vimeo.com"].includes(
          new URL(value).hostname,
        ),
      "Use a YouTube or Vimeo URL.",
    ),
    category_id: z.uuid("Choose a category."),
    technology_ids: z
      .array(z.uuid())
      .min(1, "Choose at least one technology.")
      .max(10)
      .refine((values) => new Set(values).size === values.length, "Choose each technology once."),
    launch_confirmed: z.literal(true, {
      error: "Confirm your project is completed and publicly available.",
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.live_url && !value.github_url && !value.release_url)
      ctx.addIssue({
        code: "custom",
        path: ["live_url"],
        message: "Add a working website, repository, or public release.",
      });
    if (value.launch_kind === "hosted" && !value.live_url)
      ctx.addIssue({
        code: "custom",
        path: ["live_url"],
        message: "A website or hosted app needs a live HTTPS URL.",
      });
  });

export type ProjectInput = z.output<typeof projectInputSchema>;
export const mediaSelectionSchema = z
  .object({
    ids: z
      .array(z.uuid())
      .min(1, "Add at least one screenshot.")
      .max(8)
      .refine((ids) => new Set(ids).size === ids.length),
    alt: z.array(z.string().trim().min(1, "Describe each screenshot.").max(500)).min(1).max(8),
    cover: z.uuid(),
  })
  .refine(
    (value) => value.ids.length === value.alt.length && value.ids.includes(value.cover),
    "Choose a cover from your screenshots.",
  );

export const uploadSchema = z.object({
  project_id: z.uuid(),
  size: z.number().int().min(1).max(MAX_IMAGE_BYTES),
  type: z.enum(imageTypes),
});
