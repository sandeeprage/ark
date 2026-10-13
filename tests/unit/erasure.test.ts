import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { eraseAccounts } from "@/modules/auth/erasure";
const actor = "00000000-0000-4000-a000-000000000001";
const key = `${actor}/10000000-0000-4000-a000-000000000001/20000000-0000-4000-a000-000000000001.webp`;
const remove = vi.fn(),
  deleteUser = vi.fn(),
  rpc = vi.fn();
const admin = {
  rpc,
  storage: { from: () => ({ remove }) },
  auth: { admin: { deleteUser } },
} as unknown as SupabaseClient;
beforeEach(() => {
  vi.resetAllMocks();
  remove.mockResolvedValue({ error: null });
  deleteUser.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: null, error: null });
});
function claim(objects = [{ bucket: "ark-media", key }]) {
  rpc.mockResolvedValueOnce({
    data: [{ id: "job", attempts: 1, payload: { user_id: actor, objects } }],
    error: null,
  });
}
it("cleans only captured owned objects before deleting Auth and completing the job", async () => {
  claim();
  expect(await eraseAccounts(admin)).toEqual({ completed: 1, failed: 0 });
  expect(remove).toHaveBeenCalledWith([key]);
  expect(deleteUser).toHaveBeenCalledWith(actor, false);
  expect(remove.mock.invocationCallOrder[0]).toBeLessThan(deleteUser.mock.invocationCallOrder[0]);
  expect(rpc).toHaveBeenCalledWith("finish_account_erasure", {
    p_job: "job",
    p_attempt: 1,
    p_success: true,
  });
});
it("preserves Auth until failed storage removal can be retried", async () => {
  claim();
  remove.mockResolvedValue({ error: { code: "unavailable" } });
  expect(await eraseAccounts(admin)).toEqual({ completed: 0, failed: 1 });
  expect(deleteUser).not.toHaveBeenCalled();
  expect(rpc).toHaveBeenCalledWith(
    "finish_account_erasure",
    expect.objectContaining({ p_success: false }),
  );
});
it("drains at most five accounts without claiming a sixth", async () => {
  rpc.mockImplementation(async (name: string) => ({
    data:
      name === "claim_account_erasure_jobs"
        ? [{ id: "job", attempts: 1, payload: { user_id: actor, objects: [] } }]
        : null,
    error: null,
  }));
  expect(await eraseAccounts(admin)).toEqual({ completed: 5, failed: 0 });
  expect(deleteUser).toHaveBeenCalledTimes(5);
  expect(rpc.mock.calls.filter(([name]) => name === "claim_account_erasure_jobs")).toHaveLength(5);
});
it("does not lease jobs when the time budget is exhausted", async () => {
  expect(await eraseAccounts(admin, { canStart: () => false, finalizer: admin })).toEqual({
    completed: 0,
    failed: 0,
  });
  expect(rpc).not.toHaveBeenCalled();
});
it("records a thrown storage failure using the finalizer", async () => {
  claim();
  remove.mockRejectedValue(new Error("Fixture network outage"));
  const finish = vi.fn().mockResolvedValue({ error: null });
  const finalizer = { rpc: finish } as unknown as SupabaseClient;
  expect(await eraseAccounts(admin, { canStart: () => true, finalizer })).toEqual({
    completed: 0,
    failed: 1,
  });
  expect(deleteUser).not.toHaveBeenCalled();
  expect(finish).toHaveBeenCalledWith(
    "finish_account_erasure",
    expect.objectContaining({ p_success: false }),
  );
});
it("rejects a job path belonging to another account", async () => {
  claim([{ bucket: "ark-media", key: key.replace(actor, "00000000-0000-4000-a000-000000000002") }]);
  expect(await eraseAccounts(admin)).toEqual({ completed: 0, failed: 1 });
  expect(remove).not.toHaveBeenCalled();
  expect(deleteUser).not.toHaveBeenCalled();
});
it("can finish a retry after Auth deletion already succeeded", async () => {
  claim();
  deleteUser.mockResolvedValue({ error: { status: 404, code: "user_not_found" } });
  expect(await eraseAccounts(admin)).toEqual({ completed: 1, failed: 0 });
});
it("reports a failed completion so an expired lease can be retried", async () => {
  claim();
  rpc.mockResolvedValueOnce({ data: null, error: { code: "unavailable" } });
  expect(await eraseAccounts(admin)).toEqual({ completed: 0, failed: 1 });
});
