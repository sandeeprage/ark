import { describe, it, expect } from "vitest";
import { appendUniqueProjects, feedSignature } from "@/modules/discovery/feed-state";
import type { ProjectSummary } from "@/modules/discovery/queries";
const row = (id: string, count = 0) =>
  ({ id, upvote_count: count, published_at: "2026-10-12T00:00:00Z" }) as ProjectSummary;
describe("changing feed ranks", () => {
  it("keeps loaded order and appends each incoming ID only once", () => {
    expect(
      appendUniqueProjects([row("a"), row("b")], [row("b", 5), row("c"), row("c")]).map(
        (p) => p.id,
      ),
    ).toEqual(["a", "b", "c"]);
  });
  it("detects changed totals and order", () => {
    expect(feedSignature([row("a"), row("b")])).not.toBe(feedSignature([row("a", 1), row("b")]));
    expect(feedSignature([row("a"), row("b")])).not.toBe(feedSignature([row("b"), row("a")]));
  });
  it("detects edited project text without changing rank", () => {
    expect(feedSignature([{ ...row("a"), name: "Before" }])).not.toBe(
      feedSignature([{ ...row("a"), name: "After" }]),
    );
  });
});
