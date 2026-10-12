import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { safeReturnPath } from "./validation";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  github_username: string | null;
  github_connected_at: string | null;
  created_at: string;
};
export type Viewer = {
  id: string;
  profile: Profile | null;
  status: "active" | "suspended" | "deleting";
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error && (error.status === 0 || (error.status ?? 0) >= 500))
    throw new Error("Sign-in is temporarily unavailable. Please try again.");
  if (error || !data.user) return null;
  const [{ data: profile, error: profileError }, { data: status, error: statusError }] =
    await Promise.all([
      client
        .from("profiles")
        .select("id,username,display_name,bio,github_username,github_connected_at,created_at")
        .eq("id", data.user.id)
        .maybeSingle(),
      client.rpc("my_account_status"),
    ]);
  if (
    profileError ||
    statusError ||
    (!profile && status === "active") ||
    !["active", "suspended", "deleting"].includes(status)
  )
    throw new Error("Your account couldn’t be loaded. Please try again.");
  return {
    id: data.user.id,
    profile: profile as Profile | null,
    status,
  };
});

export async function requireViewer(path: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(safeReturnPath(path))}`);
  if (viewer.status !== "active") redirect("/account-restricted");
  if (!viewer.profile?.username)
    redirect(`/onboarding?next=${encodeURIComponent(safeReturnPath(path))}`);
  return viewer;
}
