import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { configuredAuthOrigin } from "@/modules/auth/redirects";
import {
  activeGitHubActor,
  importConfig,
  IMPORT_FLOW_COOKIE,
  seal,
} from "@/modules/projects/github-import";

export async function GET(request: NextRequest) {
  const config = importConfig();
  const origin = configuredAuthOrigin();
  if (!config || !origin)
    return new NextResponse("GitHub import is not configured.", { status: 503 });
  if (request.nextUrl.host !== new URL(origin).host)
    return new NextResponse("Use ARK's configured domain.", { status: 400 });
  const actor = await activeGitHubActor();
  if (!actor) return NextResponse.redirect(new URL("/publish?github=identity", origin));
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const destination = new URL("https://github.com/login/oauth/authorize");
  destination.searchParams.set("client_id", config.clientId);
  destination.searchParams.set("redirect_uri", `${origin}/api/github/import/callback`);
  destination.searchParams.set("state", state);
  destination.searchParams.set("code_challenge", challenge);
  destination.searchParams.set("code_challenge_method", "S256");
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(
    IMPORT_FLOW_COOKIE,
    seal({ state, verifier, actor: actor.actor, expiresAt: Date.now() + 10 * 60_000 }, config.key),
    {
      httpOnly: true,
      secure: origin.startsWith("https:"),
      sameSite: "lax",
      path: "/api/github/import/callback",
      maxAge: 600,
    },
  );
  return response;
}
