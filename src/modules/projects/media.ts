import "server-only";
import { cache } from "react";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";

export type SignedMedia = {
  id: string;
  project_id: string;
  url: string;
  alt_text: string;
  width: number;
  height: number;
  position: number;
  is_cover: boolean;
};
type MediaRow = Omit<SignedMedia, "url"> & { object_key: string };

export async function getVisibleMedia(
  projectIds: string[],
  coversOnly = false,
): Promise<SignedMedia[]> {
  if (!projectIds.length || !isStorageConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_visible_project_media", {
    p_projects: projectIds.slice(0, 20),
    p_covers_only: coversOnly,
  });
  if (error || !data?.length) return [];
  const rows = data as MediaRow[];
  const { data: urls, error: signError } = await admin.storage.from("ark-media").createSignedUrls(
    rows.map((row) => row.object_key),
    300,
  );
  if (signError || !urls) return [];
  return rows.flatMap((row, index) =>
    urls[index]?.signedUrl
      ? [
          {
            id: row.id,
            project_id: row.project_id,
            url: urls[index].signedUrl,
            alt_text: row.alt_text,
            width: row.width,
            height: row.height,
            position: row.position,
            is_cover: row.is_cover,
          },
        ]
      : [],
  );
}

export const getProjectMedia = cache((id: string) => getVisibleMedia([id]));
