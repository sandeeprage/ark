import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type { Profile } from "@/modules/auth/session";

export const getPublicProfile = cache(async (username: string): Promise<Profile | null> => {
  if (!isSupabaseConfigured() || !/^[a-z0-9_]{3,30}$/.test(username)) return null;
  const client = await createClient();
  const { data, error } = await client
    .rpc("get_public_profile", { p_username: username })
    .maybeSingle();
  if (error) throw new Error("The public profile could not be loaded.");
  return data as Profile | null;
});

export async function getMakerTotals(id: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("get_public_maker_totals", { p_maker: id });
  if (error) throw new Error("Maker totals could not be loaded.");
  return { projects: Number(data?.projects ?? 0), upvotes: Number(data?.upvotes ?? 0) };
}
