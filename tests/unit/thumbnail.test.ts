import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), download: vi.fn(), admin: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  isStorageConfigured: () => true,
  createAdminClient: () => {
    mocks.admin();
    return { rpc: mocks.rpc, storage: { from: () => ({ download: mocks.download }) } };
  },
}));
import { GET } from "@/app/api/projects/[id]/thumbnail/route";
import { getVisibleMedia } from "@/modules/projects/media";
const id = "10000000-0000-4000-a000-000000000001";
const key = `00000000-0000-4000-a000-000000000001/${id}/20000000-0000-4000-a000-000000000001.webp`;
const read = (width = 320, project = id) =>
  GET(new Request(`https://ark.example.test/api/projects/${project}/thumbnail?w=${width}`), {
    params: Promise.resolve({ id: project }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({
    data: [{ project_id: id, is_cover: true, object_key: key }],
    error: null,
  });
});
it("validates identifiers and supported sizes before privileged reads", async () => {
  expect((await read(320, "invalid")).status).toBe(404);
  expect((await read(999999)).status).toBe(400);
  expect(mocks.admin).not.toHaveBeenCalled();
});
it("returns cover metadata without signing or exposing storage paths", async () => {
  const [cover] = await getVisibleMedia([id], true);
  expect(cover.url).toBe(`/api/projects/${id}/thumbnail`);
  expect(cover).not.toHaveProperty("object_key");
  expect(mocks.download).not.toHaveBeenCalled();
});
it("does not download hidden or missing project media", async () => {
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  const response = await read();
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.download).not.toHaveBeenCalled();
});
it("rejects paths for another project before storage access", async () => {
  mocks.rpc.mockResolvedValue({
    data: [
      {
        project_id: id,
        is_cover: true,
        object_key: key.replace(id, "30000000-0000-4000-a000-000000000001"),
      },
    ],
    error: null,
  });
  expect((await read()).status).toBe(404);
  expect(mocks.download).not.toHaveBeenCalled();
});
it("resizes actual bytes, removes metadata and never exposes the storage key", async () => {
  const original = await sharp({
    create: { width: 1600, height: 800, channels: 3, background: "#151515" },
  })
    .withMetadata()
    .webp()
    .toBuffer();
  mocks.download.mockResolvedValue({ data: new Blob([new Uint8Array(original)]), error: null });
  const response = await read();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("location")).toBeNull();
  const image = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(image).metadata();
  expect(metadata.width).toBe(320);
  expect(metadata.height).toBe(160);
  expect(metadata.exif).toBeUndefined();
  expect(metadata.icc).toBeUndefined();
  expect(image.length).toBeLessThan(original.length);
});
it("rechecks visibility on the next request rather than serving a cached public copy", async () => {
  const image = await sharp({
    create: { width: 80, height: 40, channels: 3, background: "#151515" },
  })
    .webp()
    .toBuffer();
  mocks.download.mockResolvedValue({ data: new Blob([new Uint8Array(image)]), error: null });
  const visible = await read();
  expect((await sharp(Buffer.from(await visible.arrayBuffer())).metadata()).width).toBe(80);
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  expect((await read()).status).toBe(404);
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.download).toHaveBeenCalledTimes(1);
});
it("fails closed when authorization lookup is unavailable", async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "unavailable" } });
  expect((await read()).status).toBe(503);
  expect(mocks.download).not.toHaveBeenCalled();
});
