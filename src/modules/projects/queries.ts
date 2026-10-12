import "server-only";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import type { ProjectSummary } from "@/modules/discovery/queries";

export const getPublicProject = cache(async (id: string): Promise<ProjectSummary | null> => {
  if (!isSupabaseConfigured() || !z.uuid().safeParse(id).success) return null;
  const client = await createClient();
  const { data, error } = await client.rpc("get_public_project", { p_id: id }).maybeSingle();
  if (error) throw new Error("The public project could not be loaded.");
  if (!data) return null;
  const project = data as ProjectSummary;
  return { ...project, upvote_count: Number(project.upvote_count) };
});
