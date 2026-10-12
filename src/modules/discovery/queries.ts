import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { filterScope, type FeedFilters } from "./filters";
import type { Profile } from "@/modules/auth/session";
import { getVisibleMedia, type SignedMedia } from "@/modules/projects/media";
import { getVoteStates, type VoteAccess } from "./votes";

export type ProjectSummary = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  live_url: string | null;
  github_url: string | null;
  release_url: string | null;
  published_at: string;
  maker_id: string;
  maker_username: string;
  maker_name: string;
  category: string;
  category_slug: string;
  stack: string[];
  upvote_count: number;
  cover?: SignedMedia;
  viewer_upvoted?: boolean;
  vote_access?: VoteAccess;
};
export type CatalogItem = { id: string; slug: string; name: string };
export const defaultCategories: CatalogItem[] = [
  { id: "", slug: "developer-tools", name: "Developer tools" },
  { id: "", slug: "web-apps", name: "Web apps" },
  { id: "", slug: "libraries", name: "Libraries" },
  { id: "", slug: "ai", name: "AI & machine learning" },
  { id: "", slug: "mobile-apps", name: "Mobile apps" },
  { id: "", slug: "games", name: "Games" },
  { id: "", slug: "other", name: "Other" },
];
const defaultTechnologies = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Python",
  "Go",
  "Rust",
  "Supabase",
  "PostgreSQL",
  "Tailwind CSS",
  "Swift",
  "Kotlin",
].map((name, i) => ({
  id: "",
  name,
  slug: [
    "typescript",
    "javascript",
    "react",
    "nextjs",
    "python",
    "go",
    "rust",
    "supabase",
    "postgresql",
    "tailwind",
    "swift",
    "kotlin",
  ][i],
}));

export const getCatalogs = cache(async () => {
  if (!isSupabaseConfigured())
    return { categories: defaultCategories, technologies: defaultTechnologies };
  const client = await createClient();
  const [categories, technologies] = await Promise.all([
    client.from("categories").select("id,slug,name").eq("active", true).order("name"),
    client.from("technologies").select("id,slug,name").eq("active", true).order("name"),
  ]);
  return {
    categories: (categories.data ?? defaultCategories) as CatalogItem[],
    technologies: (technologies.data ?? defaultTechnologies) as CatalogItem[],
  };
});

export async function listProjects(filters: FeedFilters, maker?: string) {
  if (!isSupabaseConfigured())
    return { projects: [] as ProjectSummary[], nextCursor: null, state: "setup" as const };
  const client = await createClient();
  const { data, error } = await client.rpc("list_projects", {
    p_feed: filters.feed,
    p_category: filters.category || null,
    p_stack: filters.stack,
    p_query: filters.query,
    p_cursor: filters.cursor
      ? { id: filters.cursor.id, votes: filters.cursor.votes, published: filters.cursor.published }
      : null,
    p_limit: 21,
    p_maker: maker ?? null,
  });
  if (error) return { projects: [] as ProjectSummary[], nextCursor: null, state: "error" as const };
  const rows = (data ?? []) as ProjectSummary[];
  const projects = rows
    .slice(0, 20)
    .map((row) => ({ ...row, upvote_count: Number(row.upvote_count) }));
  const last = projects[projects.length - 1];
  const covers = await getVisibleMedia(
    projects.map((project) => project.id),
    true,
  );
  const votes = await getVoteStates(projects);
  const nextCursor =
    rows.length > 20 && last
      ? {
          id: last.id,
          published: last.published_at,
          votes: last.upvote_count,
          scope: filterScope(filters),
        }
      : null;
  return {
    projects: projects.map((project) => ({
      ...project,
      cover: covers.find((image) => image.project_id === project.id),
      ...votes.find((vote) => vote.id === project.id),
    })),
    nextCursor,
    state: "ready" as const,
  };
}

export async function searchMakers(query: string) {
  if (!isSupabaseConfigured()) return { makers: [] as Profile[], error: false };
  const client = await createClient();
  const { data, error } = await client.rpc("search_makers", {
    p_query: query.slice(0, 100),
    p_limit: 20,
  });
  return { makers: (data ?? []) as Profile[], error: Boolean(error) };
}
