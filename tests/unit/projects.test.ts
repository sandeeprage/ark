import { describe, expect, it } from "vitest";
import {
  normalizeUrl,
  projectInputSchema,
  mediaSelectionSchema,
} from "@/modules/projects/validation";
const uuid = "123e4567-e89b-42d3-a456-426614174000";
const project = {
  name: "Useful toolkit",
  tagline: "A toolkit for shipping real projects",
  description: "A complete and useful tool. ".repeat(8),
  launch_kind: "software",
  live_url: "",
  github_url: "",
  release_url: "https://example.test/pkg/",
  demo_video_url: "",
  category_id: uuid,
  technology_ids: [uuid],
  launch_confirmed: true,
};
describe("launch validation", () => {
  it("supports shipped software without a fake website", () =>
    expect(projectInputSchema.parse(project).release_url).toBe("https://example.test/pkg"));
  it.each([
    "http://example.test",
    "https://user:pass@example.test/",
    "javascript:alert(1)",
    "https://localhost/",
  ])("rejects unsafe destination %s", (url) => expect(() => normalizeUrl(url)).toThrow());
  it("normalizes GitHub repository identity", () =>
    expect(normalizeUrl("https://github.com/Alice/Toolkit.git?tab=readme#install", true)).toBe(
      "https://github.com/alice/toolkit",
    ));
  it("keeps distinct paths and query values", () => {
    expect(normalizeUrl("https://EXAMPLE.test:443/a/#demo")).toBe("https://example.test/a");
    expect(normalizeUrl("https://example.test/a?q=1")).not.toBe(
      normalizeUrl("https://example.test/a?q=2"),
    );
  });
  it("requires a live destination for hosted apps", () =>
    expect(projectInputSchema.safeParse({ ...project, launch_kind: "hosted" }).success).toBe(
      false,
    ));
  it("requires launch confirmation and a stack", () => {
    expect(projectInputSchema.safeParse({ ...project, launch_confirmed: false }).success).toBe(
      false,
    );
    expect(projectInputSchema.safeParse({ ...project, technology_ids: [] }).success).toBe(false);
  });
  it("accepts only specified demo-video providers", () =>
    expect(
      projectInputSchema.safeParse({ ...project, demo_video_url: "https://random.example/video" })
        .success,
    ).toBe(false));
  it("rejects duplicate media and a foreign cover", () => {
    expect(
      mediaSelectionSchema.safeParse({ ids: [uuid, uuid], alt: ["One", "Two"], cover: uuid })
        .success,
    ).toBe(false);
    expect(
      mediaSelectionSchema.safeParse({
        ids: [uuid],
        alt: ["One"],
        cover: "00000000-0000-4000-a000-000000000002",
      }).success,
    ).toBe(false);
  });
});
