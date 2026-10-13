import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { configuredAuthOrigin } from "@/modules/auth/redirects";
import { checkPublicRepository } from "@/modules/projects/repository-check";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const result = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers });
  if (!configuredAuthOrigin() || request.headers.get("origin") !== configuredAuthOrigin())
    return result("Reload ARK and try again.", 403);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return result("Project unavailable.", 400);
  try {
    const client = await createClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError && (authError.status === 0 || (authError.status ?? 0) >= 500))
      return result("Sign-in is temporarily unavailable. Try again.", 503);
    if (authError || !user) return result("Sign in again to check ownership.", 401);
    const { data, error } = await client.rpc("begin_repository_verification", { p_project: id });
    if (error || !data) {
      if (error?.code === "P0001")
        return result("You’ve reached the hourly check limit. Try again later.", 429);
      if (error?.code === "22023")
        return result(
          "Add a GitHub repository and connect an authenticated GitHub identity first.",
          400,
        );
      if (error?.code === "42501")
        return result("Only the active project owner can check ownership.", 403);
      return result("Ownership checking is temporarily unavailable.", 503);
    }
    const check = await checkPublicRepository(data.url, data.github_user_id);
    // begin invalidates the previous claim before any provider request.
    revalidatePath(`/projects/${id}`);
    if (check.state === "provider_unavailable")
      return result(
        "GitHub is temporarily unavailable. Your project remains published; try the check again later.",
        503,
      );
    if (check.state === "unverified")
      return NextResponse.json({ state: "unverified" }, { headers });
    const { data: completed, error: writeError } = await createAdminClient().rpc(
      "complete_repository_verification",
      {
        p_project: id,
        p_attempt: data.attempt_id,
        p_repository_id: check.repositoryId,
        p_owner_id: check.ownerId,
        p_repository_url: check.url,
      },
    );
    if (writeError) return result("The check couldn’t be saved. Try again.", 503);
    if (!completed)
      return result("Your project or GitHub connection changed. Reload and check again.", 409);
    revalidatePath(`/projects/${id}`);
    return NextResponse.json({ state: "verified" }, { headers });
  } catch {
    return result("Ownership checking is temporarily unavailable.", 503);
  }
}
