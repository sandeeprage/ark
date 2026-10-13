import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), unlink: vi.fn(), link: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.user, unlinkIdentity: mocks.unlink, linkIdentity: mocks.link },
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), getAll: () => [] }),
  headers: async () => ({ get: () => "ark.example.test" }),
}));
vi.mock("@/modules/auth/redirects", () => ({
  configuredAuthOrigin: () => "https://ark.example.test",
  loginDestination: () => new URL("https://ark.example.test/login"),
}));
import {
  connectIdentity,
  disconnectIdentity,
  requestAccountDeletion,
} from "@/modules/auth/account-actions";
const identity = { identity_id: "00000000-0000-4000-a000-000000000011", provider: "github" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: "active", error: null });
  mocks.unlink.mockResolvedValue({ error: null });
});
it("denies linking, unlinking and erasure with an old verified sign-in", async () => {
  mocks.user.mockResolvedValue({
    data: {
      user: {
        id: "actor",
        last_sign_in_at: "2020-01-01T00:00:00Z",
        identities: [identity, { provider: "google" }],
      },
    },
    error: null,
  });
  expect((await connectIdentity("google")).error).toMatch(/Verify/);
  expect((await disconnectIdentity("github")).error).toMatch(/Verify/);
  expect((await requestAccountDeletion("username")).error).toMatch(/Verify/);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.unlink).not.toHaveBeenCalled();
  expect(mocks.link).not.toHaveBeenCalled();
});
it("cannot remove the final usable identity even when an email identity exists", async () => {
  mocks.user.mockResolvedValue({
    data: {
      user: {
        id: "actor",
        last_sign_in_at: new Date().toISOString(),
        identities: [identity, { provider: "email" }],
      },
    },
    error: null,
  });
  expect((await disconnectIdentity("github")).error).toMatch(/at least one/);
  expect(mocks.unlink).not.toHaveBeenCalled();
});
it("only unlinks an identity from the verified current user", async () => {
  mocks.user.mockResolvedValue({
    data: {
      user: {
        id: "actor",
        last_sign_in_at: new Date().toISOString(),
        identities: [identity, { provider: "google" }],
      },
    },
    error: null,
  });
  expect((await disconnectIdentity("github")).success).toBeTruthy();
  expect(mocks.unlink).toHaveBeenCalledWith(identity);
  expect(mocks.rpc).toHaveBeenCalledWith("sync_my_github_identity");
});
