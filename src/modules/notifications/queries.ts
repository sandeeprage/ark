import "server-only";
import { createClient } from "@/lib/supabase/server";
export type Notice = {
  id: string;
  type: "follow" | "upvote" | "launch";
  created_at: string;
  read_at: string | null;
  actor_username: string | null;
  actor_name: string | null;
  project_id: string | null;
  project_name: string | null;
};
export type Preferences = { follows: boolean; upvotes: boolean; launches: boolean };
export async function notificationStatus() {
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_notification_status");
  if (error || !data) throw new Error("Notification status couldn’t be loaded.");
  return { unread: Number(data.unread), cutoff: data.cutoff as string };
}
export async function notificationPage(after: { date: string; id: string } | null) {
  const client = await createClient();
  const { data, error } = await client.rpc("list_my_notifications", {
    p_after_created_at: after?.date ?? null,
    p_after_id: after?.id ?? null,
    p_limit: 21,
  });
  if (error) throw new Error("Notifications couldn’t be loaded.");
  const rows = (data ?? []) as Notice[];
  return {
    items: rows.slice(0, 20),
    next: rows.length > 20 ? { date: rows[19].created_at, id: rows[19].id } : null,
  };
}
export async function notificationPreferences(): Promise<Preferences> {
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_notification_preferences");
  if (error || !data) throw new Error("Your notification preferences couldn’t be loaded.");
  return data as Preferences;
}
