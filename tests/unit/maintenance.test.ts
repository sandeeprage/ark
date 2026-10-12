import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  isStorageConfigured: () => true,
  createAdminClient: () => {
    mocks.admin();
    return { rpc: mocks.rpc };
  },
}));
import { GET, POST } from "@/app/api/maintenance/media/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.stubEnv("MAINTENANCE_SECRET", "test-local-secret");
  mocks.rpc.mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.unstubAllEnvs());
const request = (token?: string) =>
  new NextRequest("https://ark.example.test/api/maintenance/media", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
it("rejects unauthenticated GET cron invocations before privileged database access", async () => {
  expect((await GET(request())).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("rejects incorrect POST secrets before privileged database access", async () => {
  expect((await POST(request("wrong-secret"))).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("accepts Vercel cron authorization and returns uncached results", async () => {
  const response = await GET(request("test-cron-secret"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ completed: 0, failed: 0 });
  expect(mocks.rpc).toHaveBeenCalledWith("claim_media_jobs", { p_limit: 10 });
});
it("does not accept the local fallback when a production cron secret is configured", async () => {
  expect((await POST(request("test-local-secret"))).status).toBe(403);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("preserves authenticated local maintenance calls", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect((await POST(request("test-local-secret"))).status).toBe(200);
});
