"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function setMakerFollow(maker: string, desired: boolean) {
  if (!z.uuid().safeParse(maker).success || typeof desired !== "boolean")
    return { ok: false as const, error: "Invalid follow request." };
  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user)
    return { ok: false as const, error: "Your session expired. Sign in again." };
  const { data, error } = await client.rpc("set_maker_follow", {
    p_maker: maker,
    p_desired: desired,
  });
  if (error)
    return {
      ok: false as const,
      error:
        error.code === "P0001"
          ? "Too many changes. Try again in a minute."
          : error.code === "42501"
            ? "Complete onboarding with an active account to follow makers."
            : "This maker couldn’t be followed. Refresh and try again.",
    };
  revalidatePath("/following");
  revalidatePath("/makers", "layout");
  return {
    ok: true as const,
    data: {
      followers: Number(data.followers),
      following: Number(data.following),
      followed: Boolean(data.followed),
    },
  };
}
