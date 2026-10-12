import { z } from "zod";

export const reservedUsernames = new Set([
  "admin",
  "ark",
  "api",
  "auth",
  "collections",
  "explore",
  "following",
  "login",
  "logout",
  "makers",
  "notifications",
  "onboarding",
  "projects",
  "publish",
  "search",
  "settings",
  "support",
]);

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores.")
    .refine((value) => !reservedUsernames.has(value), "That username is reserved."),
  display_name: z.string().trim().min(1, "Enter your name.").max(80),
  bio: z.string().trim().max(500),
});

// Only exact application paths are accepted. Never redirect to caller-controlled origins.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 500 ||
    /[\\\x00-\x1f\x7f]/.test(value) ||
    value.includes("#")
  )
    return "/explore";
  if (!value.startsWith("/") || value.startsWith("//")) return "/explore";
  const [path] = value.split("?");
  if (path.includes("%")) return "/explore";
  if (
    /^\/(explore|following|search|publish|collections|notifications|settings)$/.test(path) ||
    /^\/projects\/[0-9a-f-]{36}(\/edit)?$/.test(path) ||
    /^\/makers\/[a-z0-9_]{3,30}(\/(followers|following))?$/.test(path)
  )
    return value;
  return "/explore";
}
