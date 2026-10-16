import Link from "next/link";
import { parseFilters, feedUrl, filterScope, type SearchParams } from "@/modules/discovery/filters";
import { getCatalogs, listProjects, searchMakers } from "@/modules/discovery/queries";
import { FeedFiltersForm } from "@/components/feed-filters";
import { EmptyState } from "@/components/empty-state";
import { ProjectFeed } from "@/components/project-feed";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Search" };
export default async function Search({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const [catalogs, result, people] = await Promise.all([
    getCatalogs(),
    listProjects(filters),
    searchMakers(filters.query),
  ]);
  return (
    <div className="page">
      <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
      <h1>Search ARK</h1>
      <p className="page-description">Find projects and the people behind them.</p>
      <FeedFiltersForm filters={filters} {...catalogs} pathname="/search" />
      {!filters.query ? (
        <EmptyState
          kind="search"
          title="Start with a name."
          description="Search by project name, maker name, or username. Category and stack filters narrow project results."
        />
      ) : result.state === "setup" ? (
        <EmptyState
          title="Search is ready to connect."
          description="Connect Supabase to search real projects and makers."
        />
      ) : result.state === "error" || people.error ? (
        <EmptyState
          kind="error"
          title="Search couldn’t be loaded."
          description="Check your connection and try again."
          action={{ label: "Try again", href: feedUrl(filters, {}, "/search") }}
        />
      ) : (
        <>
          <div className="results-heading">
            <h2>Projects</h2>
            <span>{result.projects.length} results on this page</span>
          </div>
          {result.projects.length ? (
            <ProjectFeed
              contextHref={feedUrl(filters, { cursor: null }, "/search")}
              key={filterScope(filters) + JSON.stringify(filters.cursor)}
              initial={result.projects}
              initialNextUrl={
                result.nextCursor
                  ? feedUrl(filters, { cursor: result.nextCursor }, "/api/discovery/projects")
                  : null
              }
              headUrl={feedUrl(filters, { cursor: null }, "/api/discovery/projects")}
            />
          ) : (
            <EmptyState
              kind="search"
              title="No projects match this search."
              description="Try a shorter project name, or remove a category or technology filter."
              action={{ label: "Reset search", href: "/search" }}
            />
          )}

          <div className="results-heading">
            <h2>Makers</h2>
            <span>{people.makers.length} results shown</span>
          </div>
          {people.makers.length ? (
            <div className="maker-results">
              {people.makers.map((maker) => (
                <Link href={`/makers/${maker.username}`} key={maker.id} className="maker-result">
                  <Avatar id={maker.id} name={maker.display_name} hasAvatar={maker.has_avatar} version={maker.avatar_version} />
                  <div>
                    <strong>{maker.display_name}</strong>
                    <span>@{maker.username}</span>
                    <p>{maker.bio}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              kind="search"
              title="No makers match this search."
              description="Try a maker’s display name or ARK username. Project filters do not narrow maker results."
              action={{ label: "Browse makers", href: "/makers" }}
            />
          )}
        </>
      )}
    </div>
  );
}
