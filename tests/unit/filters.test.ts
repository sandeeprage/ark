import { describe, expect, it } from "vitest";
import { parseFilters, feedUrl, filterScope } from "@/modules/discovery/filters";

describe("shareable feed filters", () => {
  it("defaults to Popular and accepts only known sort modes", () => {
    expect(parseFilters({}).feed).toBe("popular");
    expect(parseFilters({ tab: "featured" }).feed).toBe("popular");
  });
  it("deduplicates stack filters and caps untrusted search input", () => {
    const filters = parseFilters({
      stack: ["react", "react", "bad slug", "python"],
      q: "x".repeat(110),
    });
    expect(filters.stack).toEqual(["python", "react"]);
    expect(filters.query).toHaveLength(100);
  });
  it("round-trips filters through a URL", () => {
    const filters = parseFilters({
      tab: "latest",
      category: "developer-tools",
      stack: ["react", "python"],
      q: "100% toolkit",
    });
    const url = new URL(feedUrl(filters), "https://ark.example");
    expect(url.searchParams.get("q")).toBe("100% toolkit");
    expect(url.searchParams.getAll("stack")).toEqual(["python", "react"]);
  });
  it("binds keyset cursors to their feed and filters", () => {
    const filters = parseFilters({ tab: "latest" });
    const cursor = {
      id: "123e4567-e89b-42d3-a456-426614174000",
      published: "2026-10-12T00:00:00+00:00",
      votes: 3,
      scope: filterScope(filters),
    };
    const encoded = Buffer.from(JSON.stringify(cursor)).toString("base64url");
    expect(parseFilters({ tab: "latest", cursor: encoded }).cursor).toEqual(cursor);
    expect(parseFilters({ tab: "popular", cursor: encoded }).cursor).toBeNull();
    expect(parseFilters({ tab: "latest", category: "games", cursor: encoded }).cursor).toBeNull();
  });
  it("recovers from malformed and oversized cursors", () => {
    expect(parseFilters({ cursor: "garbage" }).cursor).toBeNull();
    expect(parseFilters({ cursor: "x".repeat(1700) }).cursor).toBeNull();
  });
});
