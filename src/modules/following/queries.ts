import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
export type FollowState = { followers: number; following: number; followed: boolean };
export async function getFollowState(maker: string): Promise<FollowState | null> {
  if (!isSupabaseConfigured()) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("get_maker_follow_state", { p_maker: maker });
  if (error || !data) return null;
  return {
    followers: Number(data.followers),
    following: Number(data.following),
    followed: Boolean(data.followed),
  };
}
export async function listConnections(
  maker: string,
  direction: "followers" | "following",
  after: string | null,
) {
  const client = await createClient();
  const { data, error } = await client.rpc("list_maker_connections", {
    p_maker: maker,
    p_direction: direction,
    p_after: after,
    p_limit: 21,
  });
  const rows = (data ?? []) as {
    id: string;
    username: string;
    display_name: string;
    bio: string;
  }[];
  return {
    error: Boolean(error),
    makers: rows.slice(0, 20),
    next: rows.length > 20 ? rows[19].id : null,
  };
}
