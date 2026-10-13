import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/config";
import { safeReturnPath } from "@/modules/auth/validation";
import { configuredAuthOrigin, loginDestination, callbackFailure } from "@/modules/auth/redirects";

export async function GET(request: NextRequest) {
  const next = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const linkingActor = request.cookies.get("ark-link-actor")?.value;
  const origin = configuredAuthOrigin() ?? request.nextUrl.origin;
  const response = NextResponse.redirect(loginDestination(origin, next, "callback"));
  response.headers.set("Cache-Control", "private, no-store");
  if (linkingActor) response.cookies.set("ark-link-actor", "", { path: "/", maxAge: 0 });
  const fail = (reason: string, stage: string, code?: string) => {
    response.headers.set(
      "Location",
      linkingActor
        ? new URL(
            next === "/settings"
              ? `/settings?connection_error=${encodeURIComponent(reason)}`
              : `/onboarding?next=${encodeURIComponent(next)}&connection_error=${encodeURIComponent(reason)}`,
            origin,
          ).toString()
        : loginDestination(origin, next, reason).toString(),
    );
    // Log categories only, never URLs, OAuth codes, tokens or identities.
    console.warn(
      JSON.stringify({
        event: "auth_callback_failed",
        stage,
        code: code && /^[a-z_]{1,64}$/.test(code) ? code : reason,
      }),
    );
    return response;
  };
  if (!isSupabaseConfigured() || !configuredAuthOrigin()) return fail("setup", "configuration");
  const requestHost = request.headers.get("host") || new URL(request.url).host;
  if (requestHost !== new URL(origin).host) return fail("browser", "origin");
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError)
    return fail(providerError === "access_denied" ? "denied" : "provider", "provider");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 4096) return fail("expired", "missing_code");
  const config = supabaseConfig();
  const client = createServerClient(config.url, config.key, {
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(10000) }),
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates) => {
        updates.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  let issuedSession = false;
  const clearIssuedSession = async () => {
    if (!issuedSession) return;
    try {
      await client.auth.signOut({ scope: "local" });
    } catch {
      /* Explicit cookie clearing below is fail closed. */
    }
    const prefix = `sb-${new URL(config.url).hostname.split(".")[0]}-auth-token`;
    for (const cookie of [...request.cookies.getAll(), ...response.cookies.getAll()]) {
      if (cookie.name.startsWith(prefix))
        response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  };
  try {
    const { data: exchange, error } = await client.auth.exchangeCodeForSession(code);
    if (error || !exchange.session)
      return fail(callbackFailure(error?.code), "exchange", error?.code);
    issuedSession = true;
    // Re-save only ARK tokens so provider credentials never leave the server.
    const persisted = await client.auth.setSession({
      access_token: exchange.session.access_token,
      refresh_token: exchange.session.refresh_token,
    });
    if (persisted.error) {
      await clearIssuedSession();
      return fail("callback", "persist", persisted.error.code);
    }
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) {
      await clearIssuedSession();
      return fail("callback", "identity", userError?.code);
    }
    if (linkingActor && linkingActor !== user.id) {
      await clearIssuedSession();
      return fail("callback", "linked_account_mismatch");
    }
    const { data: status, error: statusError } = await client.rpc("my_account_status");
    if (statusError) {
      await clearIssuedSession();
      return fail("profile", "status");
    }
    if (status !== "active") {
      response.headers.set("Location", new URL("/account-restricted", origin).toString());
      return response;
    }
    const { error: syncError } = await client.rpc("sync_my_github_identity");
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .abortSignal(AbortSignal.timeout(8000))
      .retry(false)
      .maybeSingle();
    if (syncError || profileError || !profile) {
      await clearIssuedSession();
      return fail("profile", "profile");
    }
    response.headers.set(
      "Location",
      (profile.username
        ? new URL(next, origin)
        : new URL(`/onboarding?next=${encodeURIComponent(next)}`, origin)
      ).toString(),
    );
    return response;
  } catch {
    await clearIssuedSession();
    return fail("callback", "unexpected");
  }
}
