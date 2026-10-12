import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getVisibleMedia } from "./media";
import type { ProjectSummary } from "@/modules/discovery/queries";
import { getVoteStates } from "@/modules/discovery/votes";

export async function getPinnedProjects(makerId: string): Promise<ProjectSummary[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("get_pinned_projects", { p_maker: makerId });
  if (error) return [];
  const projects = (data ?? []) as ProjectSummary[];
  const votes = await getVoteStates(projects);
  const covers = await getVisibleMedia(
    projects.map((project) => project.id),
    true,
  );
  return projects.map((project) => ({
    ...project,
    upvote_count: Number(project.upvote_count),
    cover: covers.find((cover) => cover.project_id === project.id),
    ...votes.find((vote) => vote.id === project.id),
  }));
}
