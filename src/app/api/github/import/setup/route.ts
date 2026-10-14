import { NextResponse, type NextRequest } from "next/server";
import { configuredAuthOrigin } from "@/modules/auth/redirects";
import {
  authorizedImportSession,
  githubGet,
  IMPORT_COOKIE,
} from "@/modules/projects/github-import";

export async function GET(request: NextRequest) {
  const origin = configuredAuthOrigin();
  if (!origin || request.nextUrl.host !== new URL(origin).host)
    return new NextResponse("Use ARK's configured domain.", { status: 400 });
  const redirect = NextResponse.redirect(new URL("/publish?github=error", origin));
  redirect.headers.set("Cache-Control", "private, no-store");
  const id = request.nextUrl.searchParams.get("installation_id");
  const session = await authorizedImportSession(request.cookies.get(IMPORT_COOKIE)?.value);
  if (!id || !/^[1-9][0-9]{0,17}$/.test(id) || !session) return redirect;
  try {
    const result = await githubGet("/user/installations?per_page=100", session.token);
    if (
      Array.isArray(result.installations) &&
      result.installations.some((item: { id?: number; account?: { id?: number } }) =>
        String(item.id) === id && item.account?.id === session.githubId,
      )
    )
      redirect.headers.set("Location", new URL("/publish?github=installed", origin).toString());
  } catch {
    // An unverified installation identifier is never trusted.
  }
  return redirect;
}
