"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Preferences } from "./queries";
async function actor() {
  const c = await createClient();
  const {
    data: { user },
    error,
  } = await c.auth.getUser();
  return error || !user ? null : c;
}
export async function markNotificationsRead(ids: string[] | null, cutoff: string | null) {
  if (
    (ids === null) === (cutoff === null) ||
    (ids !== null && !z.array(z.uuid()).max(100).safeParse(ids).success) ||
    (cutoff !== null && !z.iso.datetime({ offset: true }).safeParse(cutoff).success)
  )
    return { ok: false as const, error: "Invalid notification selection." };
  const c = await actor();
  if (!c) return { ok: false as const, error: "Sign in again to read notifications." };
  const { error } = await c.rpc("mark_my_notifications_read", { p_ids: ids, p_cutoff: cutoff });
  if (error)
    return {
      ok: false as const,
      error: "Notifications couldn’t be marked read. Please try again.",
    };
  revalidatePath("/notifications");
  return { ok: true as const };
}
export async function saveNotificationPreferences(input: Preferences) {
  const parsed = z
    .object({ follows: z.boolean(), upvotes: z.boolean(), launches: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid preferences." };
  const c = await actor();
  if (!c) return { ok: false as const, error: "Sign in again to save preferences." };
  const { error } = await c.rpc("update_my_notification_preferences", {
    p_follows: parsed.data.follows,
    p_upvotes: parsed.data.upvotes,
    p_launches: parsed.data.launches,
  });
  if (error)
    return { ok: false as const, error: "Preferences couldn’t be saved. Please try again." };
  revalidatePath("/settings");
  return { ok: true as const };
}
