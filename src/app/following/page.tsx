import { requireViewer } from "@/modules/auth/session";
import { parseFilters, feedUrl, filterScope, type SearchParams } from "@/modules/discovery/filters";
import { getCatalogs, listProjects } from "@/modules/discovery/queries";
import { FeedFiltersForm } from "@/components/feed-filters";
import { ProjectFeed } from "@/components/project-feed";
import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "Following" };
export default async function Following({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireViewer("/following");
  const filters = parseFilters({ ...(await searchParams), tab: "following" });
  const [catalogs, result] = await Promise.all([getCatalogs(), listProjects(filters)]);
  const filtered = Boolean(filters.category || filters.stack.length || filters.query);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR MAKERS</p>
          <h1>Following</h1>
          <p className="page-description">New launches from the makers you follow. Newest first.</p>
        </div>
      </div>
      <FeedFiltersForm filters={filters} {...catalogs} pathname="/following" />
      <div className="results-heading">
        <h2>Latest launches</h2>
      </div>
      {result.state !== "ready" ? (
        <EmptyState
          kind="error"
          title="Launches couldn’t be loaded."
          description="Try refreshing this page."
          action={{ label: "Try again", href: feedUrl(filters, { cursor: null }, "/following") }}
        />
      ) : !result.projects.length ? (
        <EmptyState
          title={filtered ? "No matching launches." : "Find your people."}
          description={
            filtered
              ? "Clear your filters to see more work from makers you follow."
              : "Follow a maker from their profile. Their shipped projects will appear here."
          }
          action={{
            label: filtered ? "Clear filters" : "Explore projects",
            href: filtered ? "/following" : "/explore",
          }}
        />
      ) : (
        <ProjectFeed
          key={filterScope(filters) + JSON.stringify(filters.cursor)}
          initial={result.projects}
          initialNextUrl={
            result.nextCursor
              ? feedUrl(filters, { cursor: result.nextCursor }, "/api/discovery/projects")
              : null
          }
          headUrl={feedUrl(filters, { cursor: null }, "/api/discovery/projects")}
        />
      )}
    </div>
  );
}
