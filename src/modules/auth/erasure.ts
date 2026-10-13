import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export async function eraseAccounts(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("claim_account_erasure_jobs", { p_limit: 1 });
  if (error) return { completed: 0, failed: 1 };
  let completed = 0,
    failed = 0;
  for (const job of (data ?? []) as {
    id: string;
    attempts: number;
    payload: { user_id: string; objects: { bucket: string; key: string }[] };
  }[]) {
    let successful =
      z.uuid().safeParse(job.payload?.user_id).success && Array.isArray(job.payload?.objects);
    if (successful) {
      const actor = job.payload.user_id;
      successful = job.payload.objects.every((object) => {
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
    }
    if (successful) {
      const actor = job.payload.user_id;
      for (const bucket of ["ark-staging", "ark-media", "ark-avatars"]) {
        const objects = job.payload.objects.filter((object) => object.bucket === bucket);
        const pattern =
          bucket === "ark-avatars"
            ? new RegExp(`^avatars/${actor}/[0-9a-f-]{36}\\.webp$`)
            : new RegExp(`^${actor}/[0-9a-f-]{36}/[0-9a-f-]{36}(\\.webp)?$`);
        if (objects.some((object) => !pattern.test(object.key))) {
          successful = false;
          break;
        }
        for (let index = 0; index < objects.length; index += 100) {
          const result = await admin.storage
            .from(bucket)
            .remove(objects.slice(index, index + 100).map((object) => object.key));
          if (result.error) {
            successful = false;
            break;
          }
        }
        if (!successful) break;
      }
      if (
        job.payload.objects.some(
          (object) => !["ark-staging", "ark-media", "ark-avatars"].includes(object.bucket),
        )
      )
        successful = false;
      if (successful) {
        const result = await admin.auth.admin.deleteUser(actor, false);
        // Retrying after Auth deletion succeeded but job completion failed is safe.
        if (result.error && result.error.status !== 404 && result.error.code !== "user_not_found")
          successful = false;
      }
    }
    const result = await admin.rpc("finish_account_erasure", {
      p_job: job.id,
      p_attempt: job.attempts,
      p_success: successful,
    });
    if (successful && !result.error) completed++;
    else failed++;
  }
  return { completed, failed };
}
