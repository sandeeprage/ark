import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unavailable = () =>
    new NextResponse(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!z.uuid().safeParse(id).success || !isStorageConfigured()) return unavailable();
  const client = await createClient();
  const { data: profile, error } = await client
    .from("profiles")
    .select("id,username,avatar_object_key")
    .eq("id", id)
    .maybeSingle();
  if (error || !profile?.avatar_object_key) return unavailable();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!profile.username && user?.id !== id) return unavailable();
  if (user?.id === id) {
    const status = await client.rpc("my_account_status");
    if (status.error || status.data !== "active") return unavailable();
  }
  if (!new RegExp(`^avatars/${id}/[0-9a-f-]{36}\\.webp$`).test(profile.avatar_object_key))
    return unavailable();
  // RLS has authorized this profile read before privileged access to its private media.
  const { data, error: storageError } = await createAdminClient()
    .storage.from("ark-avatars")
    .download(profile.avatar_object_key);
  if (storageError || !data) return unavailable();
  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
