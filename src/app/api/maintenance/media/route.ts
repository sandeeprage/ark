import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MAINTENANCE_SECRET;
  if (!secret || !isStorageConfigured())
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const { data: jobs, error } = await admin.rpc("claim_media_jobs", { p_limit: 10 });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  let completed = 0;
  let failed = 0;
  for (const job of (jobs ?? []) as { id: string; attempts: number }[]) {
    let successful = true;
    const { data: objects, error: readError } = await admin.rpc("media_job_objects", {
      p_job: job.id,
    });
    if (readError) successful = false;
    for (const bucket of ["ark-staging", "ark-media"]) {
      const paths = ((objects ?? []) as { bucket: string; key: string }[])
        .filter((obj) => obj.bucket === bucket)
        .map((obj) => obj.key);
      if (paths.some((path) => !/^([0-9a-f-]{36}\/){2}[0-9a-f-]{36}(\.webp)?$/.test(path))) {
        successful = false;
        continue;
      }
      if (paths.length) {
        const { error: removeError } = await admin.storage.from(bucket).remove(paths);
        if (removeError) successful = false;
      }
    }
    const { error: finishError } = await admin.rpc("finish_media_job", {
      p_job: job.id,
      p_attempt: job.attempts,
      p_success: successful,
      p_code: successful ? null : "storage_cleanup_failed",
    });
    if (successful && !finishError) completed++;
    else failed++;
  }
  return NextResponse.json(
    { completed, failed },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

// Vercel's scheduler invokes GET with the same server-only bearer secret.
export const GET = POST;
