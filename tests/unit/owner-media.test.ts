import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn(), admin: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({
  isStorageConfigured: () => true,
  createAdminClient: () => {
    mock.admin();
    return { storage: { from: () => ({ createSignedUrls: mock.sign }) } };
  },
}));
import { getMyProject } from "@/modules/projects/management";
const project = {
  id: "10000000-0000-4000-a000-000000000001",
  maker_id: "00000000-0000-4000-a000-000000000001",
  name: "Hidden owner fixture",
  status: "hidden",
  version: 2,
  cover_media_id: "image",
  technology_ids: [],
  launch_kind: "software",
};
const path = project.maker_id + "/" + project.id + "/image.webp";
beforeEach(() => {
  vi.clearAllMocks();
  mock.rpc.mockResolvedValue({
    data: {
      project,
      media: [{ id: "image", alt_text: "Owner screenshot", object_key: path }],
      technology_ids: [],
      pinned: false,
    },
    error: null,
  });
  mock.sign.mockResolvedValue({
    data: [{ signedUrl: "https://storage.example.test/owner-only" }],
    error: null,
  });
});
it("signs hidden owner screenshots only after the authorized owner RPC", async () => {
  const result = await getMyProject(project.id);
  expect(result?.media[0].url).toBe("https://storage.example.test/owner-only");
  expect(mock.sign).toHaveBeenCalledWith([path], 300);
  expect(result?.media[0]).not.toHaveProperty("object_key");
});
it("does not use privileged storage after an unauthorized read", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  await expect(getMyProject(project.id)).rejects.toThrow("could not be loaded");
  expect(mock.admin).not.toHaveBeenCalled();
});
it("rejects a media path belonging to another owner", async () => {
  mock.rpc.mockResolvedValue({
    data: {
      project,
      media: [{ id: "image", object_key: "other/owner/image.webp" }],
      technology_ids: [],
    },
    error: null,
  });
  await expect(getMyProject(project.id)).rejects.toThrow("screenshots");
  expect(mock.admin).not.toHaveBeenCalled();
});
