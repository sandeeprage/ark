import Link from "next/link";
import { notFound } from "next/navigation";
import { Github, CalendarDays } from "lucide-react";
import { getViewer } from "@/modules/auth/session";
import { getPublicProfile, getMakerTotals } from "@/modules/profiles/queries";
import { parseFilters, feedUrl } from "@/modules/discovery/filters";
import { listProjects } from "@/modules/discovery/queries";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
import { getPinnedProjects } from "@/modules/projects/pins";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}
export default async function Maker({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  const filters = parseFilters({ ...(await searchParams), tab: "latest" });
  const [viewer, result, pinned, totals] = await Promise.all([
    getViewer(),
    listProjects(filters, profile.id),
    getPinnedProjects(profile.id),
    getMakerTotals(profile.id),
  ]);
  return (
    <div className="page">
      <div className="maker-profile">
        <aside className="maker-summary">
          <span className="avatar avatar-profile">
            {profile.display_name.slice(0, 1).toUpperCase()}
          </span>
          <h1>{profile.display_name}</h1>
          <p className="username">@{profile.username}</p>
          <p className="maker-bio">{profile.bio || "A maker on ARK."}</p>
          <p className="maker-totals">
            {totals.projects} shipped {totals.projects === 1 ? "project" : "projects"} ·{" "}
            {totals.upvotes} received upvotes
          </p>
          {profile.github_connected_at && profile.github_username && (
            <a
              className="connection-label"
              href={`https://github.com/${encodeURIComponent(profile.github_username)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={16} />
              GitHub connected
            </a>
          )}
          <p className="joined">
            <CalendarDays size={15} />
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
          {viewer?.id === profile.id && (
            <Link href="/settings" className="button button-outline">
              Edit profile
            </Link>
          )}
        </aside>
        <section className="maker-projects">
          {!filters.cursor && pinned.length > 0 && (
            <>
              <div className="results-heading">
                <h2>Pinned projects</h2>
                <span>{pinned.length}/6 pins</span>
              </div>
              <div className="project-grid" style={{ marginBottom: 32 }}>
                {pinned.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </>
          )}
          <div className="results-heading">
            <h2>Shipped projects</h2>
            <span>Latest first</span>
          </div>
          {result.state === "error" ? (
            <EmptyState
              kind="error"
              title="Projects couldn’t be loaded."
              description="Try refreshing this page."
            />
          ) : result.projects.length ? (
            <>
              <div className="project-grid">
                {result.projects
                  .filter((project) => !pinned.some((pin) => pin.id === project.id))
                  .map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
              </div>
              {result.nextCursor && (
                <Link
                  className="button button-outline"
                  href={feedUrl(filters, { cursor: result.nextCursor }, `/makers/${username}`)}
                >
                  Load more
                </Link>
              )}
            </>
          ) : (
            <EmptyState
              title="Great work starts somewhere."
              description="This maker hasn’t published a project on ARK yet."
              action={
                viewer?.id === profile.id
                  ? { label: "Publish a project", href: "/publish" }
                  : undefined
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
