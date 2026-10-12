import { NextResponse } from "next/server";
import { z } from "zod";
import { getVisibleMedia } from "@/modules/projects/media";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const [cover] = await getVisibleMedia([id], true);
  if (!cover)
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  return NextResponse.redirect(cover.url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}
