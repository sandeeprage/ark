import { expect, it, vi } from "vitest";
import { checkPublicRepository } from "@/modules/projects/repository-check";
const repo = {
  id: 42,
  private: false,
  visibility: "public",
  owner: { id: 7, type: "User" },
  html_url: "https://github.com/maker/work",
  fork: true,
};
function request(data = repo, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data), { status }));
}
it("checks stable personal owner IDs and allows forks without an authorship claim", async () => {
  const fetcher = request();
  expect(await checkPublicRepository("https://github.com/Maker/Work.git", "7", fetcher)).toEqual({
    state: "verified",
    repositoryId: 42,
    ownerId: 7,
    url: "https://github.com/maker/work",
  });
  expect(fetcher.mock.calls[0][0]).toBe("https://api.github.com/repos/maker/work");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "manual", cache: "no-store" });
  expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
});
it.each([
  { ...repo, owner: { id: 8, type: "User" } },
  { ...repo, owner: { id: 7, type: "Organization" } },
  { ...repo, private: true, visibility: "private" },
  { ...repo, owner: { id: "7", type: "User" } },
  { ...repo, html_url: "https://github.com/maker/different" },
  { ...repo, id: -1 },
])("rejects misleading repository metadata %#", async (data) => {
  expect(await checkPublicRepository(repo.html_url, "7", request(data as typeof repo))).toEqual({
    state: "unverified",
  });
});
it.each([
  "https://github.com.evil.test/maker/work",
  "https://github.com/maker/work/issues",
  "https://github.com:444/maker/work",
  "https://secret@github.com/maker/work",
])("does not fetch arbitrary URL %s", async (url) => {
  const fetcher = request();
  expect((await checkPublicRepository(url, "7", fetcher)).state).not.toBe("verified");
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([404, 301])("does not follow unavailable or renamed repositories (%s)", async (status) => {
  expect(await checkPublicRepository(repo.html_url, "7", request(repo, status))).toEqual({
    state: "unverified",
  });
});
it.each([403, 429, 500])(
  "handles provider failure without claiming ownership (%s)",
  async (status) => {
    expect(await checkPublicRepository(repo.html_url, "7", request(repo, status))).toEqual({
      state: "provider_unavailable",
    });
  },
);
it("handles provider network failure", async () => {
  expect(
    await checkPublicRepository(
      repo.html_url,
      "7",
      vi.fn().mockRejectedValue(new Error("timeout")),
    ),
  ).toEqual({ state: "provider_unavailable" });
});
