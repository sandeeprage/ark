import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";

const cacheHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const widths = new Set([160, 240, 320, 360, 480, 640, 768, 960, 1024, 1280]);
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const width = Number(new URL(request.url).searchParams.get("w") ?? 768);
  if (!z.uuid().safeParse(id).success)
    return new NextResponse(null, { status: 404, headers: cacheHeaders });
  if (!widths.has(width)) return new NextResponse(null, { status: 400, headers: cacheHeaders });
  if (!isStorageConfigured()) return new NextResponse(null, { status: 503, headers: cacheHeaders });
  try {
    const admin = createAdminClient();
    // This service-only RPC authorizes public project AND maker visibility before any download.
    const { data: rows, error } = await admin.rpc("get_visible_project_media", {
      p_projects: [id],
      p_covers_only: true,
    });
    if (error) return new NextResponse(null, { status: 503, headers: cacheHeaders });
    const cover = rows?.find(
      (row: { project_id: string; is_cover: boolean }) => row.project_id === id && row.is_cover,
    );
    const pathPattern = new RegExp(`^[0-9a-f-]{36}/${id}/[0-9a-f-]{36}\\.webp$`);
    if (!cover || typeof cover.object_key !== "string" || !pathPattern.test(cover.object_key))
      return new NextResponse(null, { status: 404, headers: cacheHeaders });
    const download = await admin.storage.from("ark-media").download(cover.object_key);
    if (download.error || !download.data)
      return new NextResponse(null, { status: 503, headers: cacheHeaders });
    if (download.data.size > 5 * 1024 * 1024)
      return new NextResponse(null, { status: 503, headers: cacheHeaders });
    const bytes = await sharp(Buffer.from(await download.data.arrayBuffer()), {
      limitInputPixels: 4096 * 4096,
    })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    return new NextResponse(new Uint8Array(bytes), {
      headers: { ...cacheHeaders, "Content-Type": "image/webp" },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: cacheHeaders });
  }
}
