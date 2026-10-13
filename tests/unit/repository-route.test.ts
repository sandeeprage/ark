import { beforeEach, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({
  user: vi.fn(),
  begin: vi.fn(),
  complete: vi.fn(),
  admin: vi.fn(),
  check: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mock.refresh }));
vi.mock("@/modules/auth/redirects", () => ({
  configuredAuthOrigin: () => "https://ark.example.test",
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mock.user }, rpc: mock.begin }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    mock.admin();
    return { rpc: mock.complete };
  },
}));
vi.mock("@/modules/projects/repository-check", () => ({ checkPublicRepository: mock.check }));
import { POST } from "@/app/api/projects/[id]/verify-repository/route";
const id = "10000000-0000-4000-a000-000000000001";
const context = { params: Promise.resolve({ id }) };
function request(origin = "https://ark.example.test") {
  return new Request(`${origin}/api/projects/${id}/verify-repository`, {
    method: "POST",
    headers: { origin },
  }) as NextRequest;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mock.begin.mockResolvedValue({
    data: { url: "https://github.com/maker/work", github_user_id: "7", attempt_id: "attempt" },
    error: null,
  });
  mock.check.mockResolvedValue({
    state: "verified",
    url: "https://github.com/maker/work",
    repositoryId: 42,
    ownerId: 7,
  });
  mock.complete.mockResolvedValue({ data: true, error: null });
});
it("rejects cross-origin requests before touching credentials", async () => {
  expect((await POST(request("https://evil.test"), context)).status).toBe(403);
  expect(mock.user).not.toHaveBeenCalled();
  expect(mock.admin).not.toHaveBeenCalled();
});
it("rejects signed-out requests before provider or privileged writes", async () => {
  mock.user.mockResolvedValue({ data: { user: null }, error: null });
  expect((await POST(request(), context)).status).toBe(401);
  expect(mock.begin).not.toHaveBeenCalled();
  expect(mock.check).not.toHaveBeenCalled();
  expect(mock.admin).not.toHaveBeenCalled();
});
it("keeps authentication outages recoverable without provider or privileged writes", async () => {
  mock.user.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  expect((await POST(request(), context)).status).toBe(503);
  expect(mock.check).not.toHaveBeenCalled();
  expect(mock.admin).not.toHaveBeenCalled();
});
it.each([
  ["42501", 403],
  ["22023", 400],
  ["P0001", 429],
  ["unavailable", 503],
])("stops before GitHub when authorization fails (%s)", async (code, status) => {
  mock.begin.mockResolvedValue({ data: null, error: { code } });
  expect((await POST(request(), context)).status).toBe(status);
  expect(mock.check).not.toHaveBeenCalled();
  expect(mock.admin).not.toHaveBeenCalled();
});
it("commits only server-checked metadata with the authorized attempt", async () => {
  const response = await POST(request(), context);
  expect(await response.json()).toEqual({ state: "verified" });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mock.check).toHaveBeenCalledWith("https://github.com/maker/work", "7");
  expect(mock.complete).toHaveBeenCalledWith("complete_repository_verification", {
    p_project: id,
    p_attempt: "attempt",
    p_repository_id: 42,
    p_owner_id: 7,
    p_repository_url: "https://github.com/maker/work",
  });
});
it.each(["unverified", "provider_unavailable"])(
  "does not issue privileged attestation after %s",
  async (state) => {
    mock.check.mockResolvedValue({ state });
    const response = await POST(request(), context);
    expect(response.status).toBe(state === "unverified" ? 200 : 503);
    expect(mock.admin).not.toHaveBeenCalled();
    expect(mock.refresh).toHaveBeenCalledWith(`/projects/${id}`);
  },
);
it("returns conflict when the authorized project changed during the GitHub check", async () => {
  mock.complete.mockResolvedValue({ data: false, error: null });
  expect((await POST(request(), context)).status).toBe(409);
});
it("returns a retryable error if the verification write fails", async () => {
  mock.complete.mockResolvedValue({ data: null, error: { code: "unavailable" } });
  expect((await POST(request(), context)).status).toBe(503);
});
