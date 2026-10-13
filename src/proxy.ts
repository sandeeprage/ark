import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/config";

export async function proxy(request: NextRequest) {
  if (
    process.env.ARK_MAINTENANCE_MODE === "true" &&
    !/^\/(maintenance|status|help|privacy|terms|auth|api\/maintenance)(\/|$)/.test(
      request.nextUrl.pathname,
    )
  ) {
    const response = NextResponse.rewrite(new URL("/maintenance", request.url), { status: 503 });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Retry-After", "3600");
    return response;
  }
  let response = NextResponse.next({ request });
  // Personalized pages and responses that refresh cookies must never be shared caches.
  response.headers.set("Cache-Control", "private, no-store");
  if (/^\/(status|maintenance|account-deleted)(\/|$)/.test(request.nextUrl.pathname))
    return response;
  if (!isSupabaseConfigured()) return response;
  const { url, key } = supabaseConfig();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (updates, cacheHeaders) => {
        updates.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        updates.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        response.headers.set("Cache-Control", "private, no-store");
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  await client.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
