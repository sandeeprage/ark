"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function setProjectUpvote(projectId: string, desired: boolean) {
  if (!z.uuid().safeParse(projectId).success || typeof desired !== "boolean")
    return { ok: false as const, error: "Invalid upvote request." };
  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user)
    return { ok: false as const, error: "Your session expired. Sign in again." };
  const { data, error } = await client.rpc("set_project_upvote", {
    p_project: projectId,
    p_desired: desired,
  });
  if (error)
    return {
      ok: false as const,
      error:
        error.code === "P0001"
          ? "Too many changes. Try again in a minute."
          : error.code === "42501"
            ? "An active, eligible account is required to upvote."
            : "This project couldn’t be upvoted. Refresh and try again.",
    };
  return { ok: true as const, data: { count: Number(data.count), upvoted: Boolean(data.upvoted) } };
}
