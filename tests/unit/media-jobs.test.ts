import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { cleanMedia } from "@/modules/maintenance/jobs";
const rpc = vi.fn(),
  remove = vi.fn();
const key =
  "00000000-0000-4000-a000-000000000001/10000000-0000-4000-a000-000000000001/20000000-0000-4000-a000-000000000001.webp";
const admin = { rpc, storage: { from: () => ({ remove }) } } as unknown as SupabaseClient;
const budget = { canStart: () => true, finalizer: admin };
beforeEach(() => {
  vi.resetAllMocks();
  rpc.mockResolvedValue({ data: [], error: null });
  remove.mockResolvedValue({ error: null });
});
function claim(objects: { bucket: string; key: string }[]) {
  rpc
    .mockResolvedValueOnce({ data: [{ id: "fixture-job", attempts: 1 }], error: null })
    .mockResolvedValueOnce({ data: objects, error: null });
}
it("rejects the whole object list before removing anything if a bucket is unknown", async () => {
  claim([
    { bucket: "ark-media", key },
    { bucket: "unknown", key },
  ]);
  expect(await cleanMedia(admin, budget)).toEqual({ completed: 0, failed: 1 });
  expect(remove).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith(
    "finish_media_job",
    expect.objectContaining({ p_success: false }),
  );
});
it("bounds storage removals to batches of 100", async () => {
  claim(Array.from({ length: 205 }, () => ({ bucket: "ark-media", key })));
  expect(await cleanMedia(admin, budget)).toEqual({ completed: 1, failed: 0 });
  expect(remove.mock.calls.map(([paths]) => paths.length)).toEqual([100, 100, 5]);
});
it("records transport exceptions without losing the job retry", async () => {
  claim([{ bucket: "ark-media", key }]);
  remove.mockRejectedValue(new Error("Fixture transport failure"));
  expect(await cleanMedia(admin, budget)).toEqual({ completed: 0, failed: 1 });
  expect(rpc).toHaveBeenCalledWith(
    "finish_media_job",
    expect.objectContaining({ p_success: false }),
  );
});
it("does not claim work after the budget closes", async () => {
  expect(await cleanMedia(admin, { ...budget, canStart: () => false })).toEqual({
    completed: 0,
    failed: 0,
  });
  expect(rpc).not.toHaveBeenCalled();
});
