import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), status: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/config", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mock.user },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mock.profile }) }) }),
    rpc: mock.status,
  }),
}));
import { getViewer } from "@/modules/auth/session";
beforeEach(() => {
  vi.clearAllMocks();
  mock.user.mockResolvedValue({ data: { user: { id: "viewer" } }, error: null });
  mock.profile.mockResolvedValue({ data: { id: "viewer", username: null }, error: null });
  mock.status.mockResolvedValue({ data: "active", error: null });
});
it("keeps genuine onboarding when a profile row has no username", async () => {
  expect((await getViewer())?.status).toBe("active");
  expect((await getViewer())?.profile?.username).toBeNull();
});
it("does not mislabel a transient status read as suspension", async () => {
  mock.status.mockResolvedValue({ data: null, error: { code: "unavailable" } });
  await expect(getViewer()).rejects.toThrow("couldn’t be loaded");
});
it("does not mislabel a transient profile read as onboarding", async () => {
  mock.profile.mockResolvedValue({ data: null, error: { code: "unavailable" } });
  await expect(getViewer()).rejects.toThrow("couldn’t be loaded");
});
it("does not mislabel an authentication outage as signed out", async () => {
  mock.user.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  await expect(getViewer()).rejects.toThrow("temporarily unavailable");
});
