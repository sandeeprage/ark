import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { configuredAuthOrigin } from "@/modules/auth/redirects";
import {
  activeGitHubActor,
  githubGet,
  importConfig,
  IMPORT_COOKIE,
  IMPORT_FLOW_COOKIE,
  seal,
  unseal,
} from "@/modules/projects/github-import";

type Flow = { state: string; verifier: string; actor: string; expiresAt: number };

export async function GET(request: NextRequest) {
  const origin = configuredAuthOrigin();
  const config = importConfig();
  if (!origin || !config)
    return new NextResponse("GitHub import is not configured.", { status: 503 });
  if (request.nextUrl.host !== new URL(origin).host)
    return new NextResponse("Use ARK's configured domain.", { status: 400 });
  const response = NextResponse.redirect(new URL("/publish?github=error", origin));
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(IMPORT_FLOW_COOKIE, "", { path: "/api/github/import/callback", maxAge: 0 });
  const flow = unseal<Flow>(request.cookies.get(IMPORT_FLOW_COOKIE)?.value, config.key);
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const actor = await activeGitHubActor();
  if (
    !flow ||
    !actor ||
    flow.actor !== actor.actor ||
    flow.expiresAt <= Date.now() ||
    !/^[A-Za-z0-9_-]{20,100}$/.test(state) ||
    !/^[A-Za-z0-9_-]{20,100}$/.test(flow.state) ||
    state.length !== flow.state.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(flow.state)) ||
    !code ||
    code.length > 4096 ||
    request.nextUrl.searchParams.has("error")
  )
    return response;
  try {
    const exchanged = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: `${origin}/api/github/import/callback`,
        code_verifier: flow.verifier,
      }),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!exchanged.ok) return response;
    const data = await exchanged.json();
    if (
      typeof data.access_token !== "string" ||
      !data.access_token.startsWith("ghu_") ||
      !Number.isSafeInteger(data.expires_in) ||
      data.expires_in < 120
    )
      return response;
    const githubUser = await githubGet("/user", data.access_token);
    if (githubUser.id !== actor.githubId) return response;
    const maxAge = Math.min(data.expires_in - 60, 28_740);
    response.headers.set("Location", new URL("/publish?github=connected", origin).toString());
    response.cookies.set(
      IMPORT_COOKIE,
      seal(
        {
          actor: actor.actor,
          githubId: actor.githubId,
          token: data.access_token,
          expiresAt: Date.now() + maxAge * 1000,
        },
        config.key,
      ),
      {
        httpOnly: true,
        secure: origin.startsWith("https:"),
        sameSite: "lax",
        path: "/",
        maxAge,
      },
    );
  } catch {
    // No provider code or token reaches browser-visible errors or logs.
  }
  return response;
}
