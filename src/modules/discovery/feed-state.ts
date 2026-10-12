import type { ProjectSummary } from "./queries";

export function feedSignature(projects: ProjectSummary[]) {
  return JSON.stringify(
    projects.map((p) => [
      p.id,
      p.upvote_count,
      p.published_at,
      p.name,
      p.tagline,
      p.maker_name,
      p.category,
      p.stack,
      p.cover?.id,
      p.cover?.alt_text,
    ]),
  );
}
export function appendUniqueProjects(current: ProjectSummary[], incoming: ProjectSummary[]) {
  const seen = new Set(current.map((p) => p.id));
  return [
    ...current,
    ...incoming.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }),
  ];
}
