import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/modules/auth/session";
import type { ProjectSummary } from "@/modules/discovery/queries";
import { getVisibleMedia } from "@/modules/projects/media";
import { getVoteStates } from "@/modules/discovery/votes";
export type Collection = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  is_default: boolean;
  project_count: number;
  maker_username?: string;
  maker_name?: string;
};
export async function listCollections(owner: string): Promise<Collection[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("list_collections", { p_owner: owner });
  if (error) throw new Error("Collections couldn’t be loaded. Please try again.");
  return (data ?? []) as Collection[];
}
export async function getCollection(id: string): Promise<Collection | null> {
  const client = await createClient();
  const { data, error } = await client.rpc("get_public_collection", { p_collection: id });
  if (error) throw new Error("This collection couldn’t be loaded. Please try again.");
  return data as Collection | null;
}
export async function getSavedStates(projects: { id: string }[]) {
  const viewer = await getViewer();
  if (!viewer || viewer.status !== "active" || !viewer.profile?.username || !projects.length)
    return [] as string[];
  const client = await createClient();
  const { data, error } = await client.rpc("get_my_saved_projects", {
    p_projects: projects.map((p) => p.id),
  });
  if (error) throw new Error("Your saved projects couldn’t be loaded.");
  return (data ?? []).map((r: { project_id: string }) => r.project_id) as string[];
}
export async function collectionProjects(id: string, after: { added: string; id: string } | null) {
  const client = await createClient();
  const { data, error } = await client.rpc("list_collection_projects", {
    p_collection: id,
    p_after: after,
    p_limit: 21,
  });
  if (error) throw new Error("Collection projects couldn’t be loaded.");
  const rows = (data ?? []) as (ProjectSummary & { added_at: string })[];
  const projects = rows.slice(0, 20);
  const [covers, votes] = await Promise.all([
    getVisibleMedia(
      projects.map((p) => p.id),
      true,
    ),
    getVoteStates(projects),
  ]);
  return {
    projects: projects.map((p) => ({
      ...p,
      upvote_count: Number(p.upvote_count),
      cover: covers.find((i) => i.project_id === p.id),
      ...votes.find((v) => v.id === p.id),
    })),
    next: rows.length > 20 ? { added: rows[19].added_at, id: rows[19].id } : null,
  };
}
