import "server-only";
import { getViewer } from "@/modules/auth/session";
import { createClient } from "@/lib/supabase/server";

export type VoteAccess = "anonymous" | "active" | "owner" | "restricted";
export async function getVoteStates(projects: { id: string; maker_id: string }[]) {
  const viewer = await getViewer();
  let ids = new Set<string>();
  if (viewer?.status === "active" && projects.length) {
    const client = await createClient();
    const { data, error } = await client.rpc("get_my_project_votes", {
      p_projects: projects.map((p) => p.id),
    });
    if (error) throw new Error("Your upvote state could not be loaded.");
    ids = new Set((data ?? []).map((row: { project_id: string }) => row.project_id));
  }
  return projects.map((project) => ({
    id: project.id,
    viewer_upvoted: ids.has(project.id),
    vote_access: (!viewer
      ? "anonymous"
      : viewer.id === project.maker_id
        ? "owner"
        : viewer.status !== "active" || !viewer.profile?.username
          ? "restricted"
          : "active") as VoteAccess,
  }));
}
