import { describe, expect, it } from "vitest";
import { profileSchema, safeReturnPath } from "@/modules/auth/validation";

describe("internal OAuth redirects", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%2f%2fevil.example",
    "/explore\n",
    null,
    "/auth/callback",
    "/admin/reports",
  ])("rejects unsafe or unapproved destinations %s", (value) =>
    expect(safeReturnPath(value)).toBe("/explore"),
  );
  it("preserves a permitted internal query", () =>
    expect(safeReturnPath("/explore?tab=latest")).toBe("/explore?tab=latest"));
  it("accepts an internal publish return", () =>
    expect(safeReturnPath("/publish")).toBe("/publish"));
});
describe("public profile validation", () => {
  it("normalizes the username without treating display names as identities", () =>
    expect(
      profileSchema.parse({ username: " Alice_Dev ", display_name: "Alice", bio: "" }).username,
    ).toBe("alice_dev"));
  it.each(["admin", "ark", "ab", "name-with-dash", "x".repeat(31)])(
    "rejects username %s",
    (username) =>
      expect(profileSchema.safeParse({ username, display_name: "Alice", bio: "" }).success).toBe(
        false,
      ),
  );
  it("rejects oversized bios and empty names", () => {
    expect(
      profileSchema.safeParse({ username: "alice", display_name: "Alice", bio: "x".repeat(501) })
        .success,
    ).toBe(false);
    expect(profileSchema.safeParse({ username: "alice", display_name: " ", bio: "" }).success).toBe(
      false,
    );
  });
});
