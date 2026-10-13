import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";
import { eraseAccounts } from "@/modules/auth/erasure";
import { cleanMedia } from "@/modules/maintenance/jobs";

export const maxDuration = 60;
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MAINTENANCE_SECRET;
  if (!secret || !isStorageConfigured())
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const started = Date.now();
  // Stop admitting work at 35 s, abort work at 45 s, reserve 10 s for its failure record.
  const budget = { canStart: () => Date.now() - started < 35000, finalizer: createAdminClient() };
  const admin = createAdminClient({ signal: AbortSignal.timeout(45000) });
  const accounts = await eraseAccounts(admin, budget);
  const media = await cleanMedia(admin, budget);
  let failed = accounts.failed + media.failed;
  const completed = accounts.completed + media.completed;
  if (budget.canStart()) {
    try {
      const retention = await admin.rpc("purge_moderation_records");
      if (retention.error) failed++;
    } catch {
      failed++;
    }
  }
  const deferred = !budget.canStart();
  console.info(
    JSON.stringify({
      event: "maintenance_finished",
      completed,
      failed,
      deferred,
      duration_ms: Date.now() - started,
    }),
  );
  return NextResponse.json(
    { completed, failed, deferred },
    { status: failed || deferred ? 503 : 200, headers: { "Cache-Control": "private, no-store" } },
  );
}

// Vercel's scheduler invokes GET with the same server-only bearer secret.
export const GET = POST;
