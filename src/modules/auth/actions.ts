"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { profileSchema, safeReturnPath } from "./validation";
import { headers, cookies } from "next/headers";
import { configuredAuthOrigin, loginDestination } from "./redirects";

export type FormState = { error?: string; success?: string; fields?: Record<string, string[]> };

export async function signIn(form: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?error=setup");
  const provider = form.get("provider");
  if (provider !== "github" && provider !== "google") redirect("/login?error=provider");
  const returnPath = safeReturnPath(form.get("next"));
  const origin = configuredAuthOrigin();
  if (!origin) redirect("/login?error=setup");
  const host = (await headers()).get("host");
  if (host !== new URL(origin).host) redirect(loginDestination(origin, returnPath).toString());
  const client = await createClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(returnPath)}`,
      ...(provider === "github" ? { scopes: "read:user user:email" } : {}),
    },
  });
  if (error || !data.url) redirect("/login?error=provider");
  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    try {
      await (await createClient()).auth.signOut({ scope: "local" });
    } catch {
      /* Remove this browser's local session even during a provider outage. */
    } finally {
      const prefix = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
      const store = await cookies();
      for (const cookie of store.getAll())
        if (
          cookie.name === prefix ||
          cookie.name.startsWith(prefix + ".") ||
          cookie.name.startsWith(prefix + "-")
        )
          store.delete(cookie.name);
    }
  }
  redirect("/explore");
}

export async function saveProfile(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    username: form.get("username"),
    display_name: form.get("display_name"),
    bio: form.get("bio"),
  });
  if (!parsed.success)
    return { error: "Check the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  if (!isSupabaseConfigured()) return { error: "Connect Supabase before saving your profile." };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const { error } = await client.rpc("update_my_profile", {
    p_username: parsed.data.username,
    p_display_name: parsed.data.display_name,
    p_bio: parsed.data.bio,
  });
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That username is taken. Try another."
          : "Your profile could not be saved. Check your account access and try again.",
    };
  revalidatePath("/", "layout");
  if (form.get("onboarding") === "true") redirect(safeReturnPath(form.get("next")));
  return { success: "Profile saved." };
}
