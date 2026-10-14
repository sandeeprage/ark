import { NextResponse, type NextRequest } from "next/server";
import {
  authorizedImportSession,
  importConfig,
  listImportRepositories,
  IMPORT_COOKIE,
} from "@/modules/projects/github-import";

export async function GET(request: NextRequest) {
  if (!importConfig())
    return NextResponse.json({ error: "GitHub import is not configured." }, { status: 503 });
  const session = await authorizedImportSession(request.cookies.get(IMPORT_COOKIE)?.value);
  if (!session)
    return NextResponse.json(
      { error: "Connect GitHub repository access to continue." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  try {
    const data = await listImportRepositories(session.token);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub repositories are unavailable." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
