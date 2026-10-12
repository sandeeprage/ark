import { NextResponse, type NextRequest } from "next/server";
import { parseFilters, feedUrl, type SearchParams } from "@/modules/discovery/filters";
import { listProjects } from "@/modules/discovery/queries";
import { feedSignature } from "@/modules/discovery/feed-state";

export async function GET(request: NextRequest) {
  const params: SearchParams = {};
  for (const key of request.nextUrl.searchParams.keys())
    params[key] = request.nextUrl.searchParams.getAll(key);
  const filters = parseFilters(params);
  const [result, top] = await Promise.all([
    listProjects(filters),
    filters.cursor ? listProjects({ ...filters, cursor: null }) : Promise.resolve(null),
  ]);
  const head = top ?? result;
  if (result.state !== "ready" || head.state !== "ready")
    return NextResponse.json(
      { error: "Projects couldn’t be loaded." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  return NextResponse.json(
    {
      projects: result.projects,
      nextUrl: result.nextCursor
        ? feedUrl(filters, { cursor: result.nextCursor }, "/api/discovery/projects")
        : null,
      signature: feedSignature(head.projects),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
