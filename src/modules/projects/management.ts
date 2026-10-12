import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getVisibleMedia } from "./media";
import type { InitialProject, ProjectFormValues } from "@/components/project-form";

export async function getMyProject(
  id: string,
): Promise<(InitialProject & { pinned: boolean; name: string }) | null> {
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_project", { p_project: id });
  if (error) throw new Error("Your project could not be loaded.");
  if (!data) return null;
  const raw = data as {
    project: {
      id: string;
      version: number;
      status: string;
      cover_media_id: string | null;
      name: string;
      tagline: string;
      description: string;
      launch_kind: "hosted" | "software";
      live_url: string | null;
      github_url: string | null;
      release_url: string | null;
      demo_video_url: string | null;
      category_id: string;
    };
    technology_ids: string[];
    media: { id: string; alt_text: string }[];
    pinned: boolean;
  };
  const images = await getVisibleMedia([id]);
  const project = raw.project;
  const values: ProjectFormValues = {
    name: project.name,
    tagline: project.tagline,
    description: project.description,
    launch_kind: project.launch_kind,
    live_url: project.live_url ?? "",
    github_url: project.github_url ?? "",
    release_url: project.release_url ?? "",
    demo_video_url: project.demo_video_url ?? "",
    category_id: project.category_id,
    technology_ids: raw.technology_ids,
    launch_confirmed: true,
  };
  return {
    id: project.id,
    version: project.version,
    status: project.status,
    cover_media_id: project.cover_media_id,
    values,
    media: raw.media.map((image) => ({
      id: image.id,
      alt_text: image.alt_text,
      url: images.find((signed) => signed.id === image.id)?.url ?? "",
    })),
    pinned: raw.pinned,
    name: project.name,
  };
}
