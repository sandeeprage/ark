"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { configuredAuthOrigin, loginDestination } from "./redirects";
import { recentlyAuthenticated, usableIdentities } from "./account-validation";
import { safeReturnPath } from "./validation";

export async function connectIdentity(provider: string, next = "/settings") {
  if (provider !== "github" && provider !== "google") return { error: "Choose GitHub or Google." };
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "Sign in again to connect an account." };
  if (!recentlyAuthenticated(user.last_sign_in_at))
    return { error: "Verify your sign-in again before connecting an account." };
  const { data: status, error: statusError } = await client.rpc("my_account_status");
  if (statusError || status !== "active") return { error: "An active account is required." };
  const origin = configuredAuthOrigin();
  if (!origin) return { error: "Account connection is temporarily unavailable." };
  if ((await headers()).get("host") !== new URL(origin).host)
    redirect(loginDestination(origin, safeReturnPath(next)).toString());
  const result = await client.auth.linkIdentity({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(next))}`,
      scopes: provider === "github" ? "read:user user:email" : "openid email profile",
    },
  });
  if (result.error || !result.data.url)
    return {
      error:
        "This account could not be connected. It may already belong to another ARK account. Try again or contact support; your current sign-in remains available.",
    };
  (await cookies()).set("ark-link-actor", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  redirect(result.data.url);
}

export async function disconnectIdentity(provider: string) {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "Sign in again to manage connected accounts." };
  if (!recentlyAuthenticated(user.last_sign_in_at))
    return { error: "Verify your sign-in again before disconnecting an account." };
  const { data: status, error: statusError } = await client.rpc("my_account_status");
  if (statusError || status !== "active") return { error: "An active account is required." };
  const identities = usableIdentities(user.identities ?? []);
  if (identities.length < 2)
    return { error: "Keep at least one usable sign-in identity connected." };
  const identity = user.identities?.find(
    (entry) => entry.provider === provider && (provider === "github" || provider === "google"),
  );
  if (!identity) return { error: "That identity is not connected to your account." };
  const { error: unlinkError } = await client.auth.unlinkIdentity(identity);
  if (unlinkError) return { error: "The account could not be disconnected. Try again." };
  const { error: syncError } = await client.rpc("sync_my_github_identity");
  revalidatePath("/", "layout");
  if (syncError)
    return {
      error:
        "The sign-in identity was disconnected, but its profile display needs to be refreshed. Sign in again or contact support.",
    };
  return { success: "Account disconnected." };
}

export async function requestAccountDeletion(confirmation: string) {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "Sign in again before deleting your account." };
  if (!recentlyAuthenticated(user.last_sign_in_at))
    return { error: "Verify your sign-in again before deleting your account." };
  const { error: deletionError } = await client.rpc("request_my_account_erasure", {
    p_confirmation: confirmation,
  });
  if (deletionError)
    return {
      error:
        "Deletion could not be requested. Check the confirmation and your recent sign-in, then try again.",
    };
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    /* Local cookie removal still completes. */
  }
  const prefix = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
  const store = await cookies();
  for (const cookie of store.getAll())
    if (cookie.name.startsWith(prefix)) store.delete(cookie.name);
  revalidatePath("/", "layout");
  redirect("/account-deleted");
}
