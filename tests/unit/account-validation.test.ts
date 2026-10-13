import { expect, it } from "vitest";
import { recentlyAuthenticated, usableIdentities } from "@/modules/auth/account-validation";
it("requires a real recent sign-in instead of a refreshed JWT timestamp", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  expect(recentlyAuthenticated(undefined, now)).toBe(false);
  expect(recentlyAuthenticated("invalid", now)).toBe(false);
  expect(recentlyAuthenticated("2026-10-13T11:40:00Z", now)).toBe(false);
  expect(recentlyAuthenticated("2026-10-13T11:59:00Z", now)).toBe(true);
  expect(recentlyAuthenticated("2026-10-13T13:00:00Z", now)).toBe(false);
});
it("counts only identities that can actually sign in to ARK", () => {
  expect(
    usableIdentities([{ provider: "github" }, { provider: "email" }, { provider: "google" }]),
  ).toEqual([{ provider: "github" }, { provider: "google" }]);
});
