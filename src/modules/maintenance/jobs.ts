import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type JobBudget = {
  canStart: () => boolean;
  finalizer: SupabaseClient;
};
export async function cleanMedia(admin: SupabaseClient, budget: JobBudget) {
  let completed = 0,
    failed = 0;
  for (let index = 0; index < 10 && budget.canStart(); index++) {
    let jobs;
    try {
      const result = await admin.rpc("claim_media_jobs", { p_limit: 1 });
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
    const job = jobs[0] as { id: string; attempts: number };
    let successful = false;
    try {
      const { data: objects, error } = await admin.rpc("media_job_objects", { p_job: job.id });
      const valid =
        !error &&
        Array.isArray(objects) &&
        objects.every(
          (object) =>
            object &&
            typeof object.key === "string" &&
            (object.bucket === "ark-avatars"
              ? /^avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(object.key)
              : ["ark-staging", "ark-media"].includes(object.bucket) &&
                /^([0-9a-f-]{36}\/){2}[0-9a-f-]{36}(\.webp)?$/.test(object.key)),
        );
      if (valid) {
        successful = true;
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
      }
    } catch {
      successful = false;
    }
    try {
      const result = await budget.finalizer.rpc("finish_media_job", {
        p_job: job.id,
        p_attempt: job.attempts,
        p_success: successful,
        p_code: successful ? null : "storage_cleanup_failed",
      });
      if (successful && !result.error) completed++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { completed, failed };
}
