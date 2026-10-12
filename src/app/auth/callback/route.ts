import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { safeReturnPath } from "@/modules/auth/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const destination = new URL("/login?error=callback", request.url);
  if (code && isSupabaseConfigured()) {
    const client = await createClient();
    const { data: exchange, error } = await client.auth.exchangeCodeForSession(code);
    // The Auth session initially includes OAuth provider tokens. Re-save only the
    // ARK access/refresh tokens before the response sends any cookies to the browser.
    const persisted =
      !error && exchange.session
        ? await client.auth.setSession({
            access_token: exchange.session.access_token,
            refresh_token: exchange.session.refresh_token,
          })
        : null;
    if (!error && persisted && !persisted.error) {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (user) {
        const { error: syncError } = await client.rpc("sync_my_github_identity");
        const { data: profile } = await client
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();
        if (!syncError) {
          destination.pathname = profile?.username ? next.split("?")[0] : "/onboarding";
          destination.search = profile?.username
            ? new URL(next, request.url).search
            : `?next=${encodeURIComponent(next)}`;
        }
      }
    } else if (exchange.session) await client.auth.signOut();
  }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
