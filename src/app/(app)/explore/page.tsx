import Link from "@/components/intent-link";
import { ArrowDownWideNarrow, ArrowUpRight, Clock3, Code2, Plus, Sparkles } from "lucide-react";
import { parseFilters, feedUrl, filterScope, type SearchParams } from "@/modules/discovery/filters";
import { getCatalogs, listProjects } from "@/modules/discovery/queries";
import { FeedFiltersForm } from "@/components/feed-filters";
import { EmptyState } from "@/components/empty-state";
import { ProjectFeed } from "@/components/project-feed";

export const metadata = { title: "Explore" };
export default async function Explore({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = parseFilters(await searchParams);
  const [catalogs, result] = await Promise.all([getCatalogs(), listProjects(filters)]);
  const filtered = Boolean(filters.category || filters.stack.length || filters.query);
  return (
    <div className="page explore-page">
      <div className="explore-layout">
        <div className="feed-column">
          <div className="page-heading">
            <div>
              <p className="eyebrow">THE DEVELOPER LAUNCHPAD</p>
              <h1>
                Good work deserves
                <br className="desktop-break" /> to be discovered
                <span className="muted-period">.</span>
              </h1>
              <p className="page-description">
                Explore what developers are shipping.
                <br className="mobile-break" /> Find your next favorite project.
              </p>
            </div>
          </div>
          <div className="feed-tabs">
            <nav aria-label="Project feed">
              <Link
                href={feedUrl(filters, { feed: "popular", cursor: null })}
                className={filters.feed === "popular" ? "active" : ""}
                aria-current={filters.feed === "popular" ? "page" : undefined}
              >
                <ArrowDownWideNarrow size={16} />
                Popular
              </Link>
              <Link
                href={feedUrl(filters, { feed: "latest", cursor: null })}
                className={filters.feed === "latest" ? "active" : ""}
                aria-current={filters.feed === "latest" ? "page" : undefined}
              >
                <Clock3 size={16} />
                Latest
              </Link>
            </nav>
            <span className="sort-label">
              {filters.feed === "popular" ? "Sorted by total upvotes" : "Newest launches first"}
            </span>
          </div>
          <FeedFiltersForm filters={filters} {...catalogs} />
          <div className="results-heading">
            <h2>
              {filters.cursor
                ? "More projects"
                : filters.feed === "popular"
                  ? "Popular projects"
                  : "Latest launches"}
            </h2>
            <span>
              {result.projects.length
                ? `${result.projects.length} projects`
                : "Made by developers, for everyone"}
            </span>
          </div>
          {result.state === "setup" ? (
            <>
              <div className="setup-note">
                <span className="status-dot" />
                <span>Local preview · Supabase connection pending</span>
              </div>
              <EmptyState
                title="The next great launch could be yours."
                description="ARK is taking shape. Once the backend is connected, real launches will appear here—ready to discover, upvote, and collect."
                action={{ label: "Explore ARK", href: "/login" }}
              />
            </>
          ) : result.state === "error" ? (
            <EmptyState
              kind="error"
              title="Projects couldn’t be loaded."
              description="Check your connection and try again. If you’re setting up ARK, make sure the database migration has been applied."
              action={{ label: "Try again", href: feedUrl(filters, { cursor: null }) }}
            />
          ) : result.projects.length === 0 ? (
            <EmptyState
              kind={filtered ? "search" : "empty"}
              title={filtered ? "No projects found." : "Be the first to ship here."}
              description={
                filtered
                  ? "Try another search or clear your filters to see more work."
                  : "This is a fresh start. Completed, publicly available projects belong here."
              }
              action={{
                label: filtered ? "Clear filters" : "Publish a project",
                href: filtered
                  ? feedUrl(filters, { category: "", stack: [], query: "", cursor: null })
                  : "/publish",
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
          <div className="feed-endnote">
            <Code2 size={16} />
            <p>Completed projects. Real makers. A place for the work.</p>
          </div>
        </div>
        <aside className="discovery-aside">
          <Link href="/publish" className="button button-primary discovery-publish">
            <Plus size={17} /> Share your work
          </Link>
          <section className="community-note">
            <span className="small-icon">
              <Sparkles size={19} strokeWidth={1.3} />
            </span>
            <p className="eyebrow">BUILT. SHIPPED. SHARED.</p>
            <h2>
              Less noise.
              <br />
              More making.
            </h2>
            <p>A home for the projects you actually finished. No hype required.</p>
            <Link href="/makers" className="text-link">
              Meet your next community
              <ArrowUpRight size={14} />
            </Link>
          </section>
          <section className="category-directory">
            <h2>Browse by category</h2>
            {catalogs.categories.slice(0, 6).map((category) => (
              <Link
                key={category.slug}
                href={feedUrl(filters, { category: category.slug, cursor: null })}
              >
                {category.name}
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </section>
          <div className="maker-note">
            <span className="tiny-rule" />
            <p>
              That side project you finally shipped?
              <br />
              That tool you wish existed?
              <br />
              <strong>There’s a place for it here.</strong>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
