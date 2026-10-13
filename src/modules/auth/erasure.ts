import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { JobBudget } from "@/modules/maintenance/jobs";

type ErasureJob = {
  id: string;
  attempts: number;
  payload: { user_id: string; objects: { bucket: string; key: string }[] };
};
export async function eraseAccounts(admin: SupabaseClient, options?: JobBudget) {
  const canStart = options?.canStart ?? (() => true);
  const finalizer = options?.finalizer ?? admin;
  let completed = 0,
    failed = 0;
  // Claim individually so a deadline never leaves an unstarted batch leased.
  for (let index = 0; index < 5 && canStart(); index++) {
    let jobs;
    try {
      const result = await admin.rpc("claim_account_erasure_jobs", { p_limit: 1 });
      if (result.error) {
        failed++;
        break;
      }
      jobs = result.data;
    } catch {
      failed++;
      break;
    }
    if (!jobs?.length) break;
    const job = jobs[0] as ErasureJob;
    let successful = false;
    try {
      const actor = job.payload?.user_id;
      const objects = job.payload?.objects;
      successful =
        z.uuid().safeParse(actor).success &&
        Array.isArray(objects) &&
        objects.every((object) => {
          if (
            !object ||
            !["ark-staging", "ark-media", "ark-avatars"].includes(object.bucket) ||
            typeof object.key !== "string"
          )
            return false;
          const pattern =
            object.bucket === "ark-avatars"
              ? new RegExp(`^avatars/${actor}/[0-9a-f-]{36}\\.webp$`)
              : new RegExp(`^${actor}/[0-9a-f-]{36}/[0-9a-f-]{36}(\\.webp)?$`);
          return pattern.test(object.key);
        });
      if (successful) {
        for (const bucket of ["ark-staging", "ark-media", "ark-avatars"]) {
          const paths = objects
            .filter((object) => object.bucket === bucket)
            .map((object) => object.key);
          for (let offset = 0; offset < paths.length; offset += 100) {
            const result = await admin.storage
              .from(bucket)
              .remove(paths.slice(offset, offset + 100));
            if (result.error) {
              successful = false;
              break;
            }
          }
          if (!successful) break;
        }
        if (successful) {
          const result = await admin.auth.admin.deleteUser(actor, false);
          // Retrying after Auth deletion succeeded but completion failed is safe.
          if (result.error && result.error.status !== 404 && result.error.code !== "user_not_found")
            successful = false;
        }
      }
    } catch {
      successful = false;
    }
    try {
      const result = await finalizer.rpc("finish_account_erasure", {
        p_job: job.id,
        p_attempt: job.attempts,
        p_success: successful,
      });
      if (successful && !result.error) completed++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { completed, failed };
}
