import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { UpvoteButton } from "@/components/upvote-button";
import { getVoteStates } from "@/modules/discovery/votes";
import { getPublicProject } from "@/modules/projects/queries";
import { ShareButton } from "@/components/share-button";
import { getProjectMedia } from "@/modules/projects/media";
import { getViewer } from "@/modules/auth/session";
import { getMyProject } from "@/modules/projects/management";
import { ProjectGallery } from "@/components/project-gallery";
import { ProjectManagement } from "@/components/project-management";
import { SaveButton } from "@/components/save-button";
import { getSavedStates } from "@/modules/collections/queries";
import { getRepositoryVerification } from "@/modules/projects/verification";
import { RepositoryVerification } from "@/components/repository-verification";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const project = await getPublicProject((await params).id);
  if (!project) return { title: "Project unavailable" };
  const canonical = `${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/projects/${project.id}`;
  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical },
    openGraph: {
      title: project.name,
      description: project.tagline,
      url: canonical,
      type: "website" as const,
      images: [
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/api/projects/${project.id}/cover`,
      ],
    },
  };
}
export default async function Project({ params }: { params: Promise<{ id: string }> }) {
  const project = await getPublicProject((await params).id);
  if (!project) notFound();
  const [images, [vote], saved, management, verification, viewer] = await Promise.all([
    getProjectMedia(project.id),
    getVoteStates([project]),
    getSavedStates([project]),
    getViewer().then((viewer) =>
      viewer?.id === project.maker_id && viewer.status === "active"
        ? getMyProject(project.id)
        : null,
    ),
    project.github_url ? getRepositoryVerification(project.id) : Promise.resolve(null),
    getViewer(),
  ]);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000"}/projects/${project.id}`;
  return (
    <div className="page project-detail">
      <Link href="/explore" className="text-link">
        <ArrowLeft size={15} />
        Back to Explore
      </Link>
      <div className="project-intro">
        <p className="eyebrow">{project.category.toUpperCase()}</p>
        <h1>{project.name}</h1>
        <p className="page-description">{project.tagline}</p>
        <Link href={`/makers/${project.maker_username}`} className="project-maker">
          <span className="avatar">{project.maker_name.slice(0, 1).toUpperCase()}</span>
          <span>
            Built by <strong>{project.maker_name}</strong>
            <small>@{project.maker_username}</small>
          </span>
        </Link>
        <div className="project-actions">
          {project.live_url && (
            <a
              className="button button-primary"
              href={project.live_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit project
              <ArrowUpRight size={16} />
            </a>
          )}
          {project.github_url && (
            <a
              className="button button-outline"
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={16} />
              Repository
              <ArrowUpRight size={16} />
            </a>
          )}
          {project.release_url && (
            <a
              className="button button-outline"
              href={project.release_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Public release
              <ArrowUpRight size={16} />
            </a>
          )}
          <UpvoteButton
            id={project.id}
            count={project.upvote_count}
            upvoted={vote.viewer_upvoted}
            access={vote.vote_access}
          />
          <ShareButton title={project.name} url={url} />
          <SaveButton
            id={project.id}
            saved={saved.includes(project.id)}
            access={vote.vote_access}
          />
        </div>
        {management && (
          <ProjectManagement id={project.id} name={project.name} pinned={management.pinned} />
        )}
        {project.github_url && (
          <RepositoryVerification
            id={project.id}
            verification={verification}
            owner={Boolean(management)}
            connected={Boolean(viewer?.profile?.github_connected_at)}
          />
        )}
      </div>
      <ProjectGallery images={images} />
      <div className="project-content">
        <section>
          <h2>About this project</h2>
          <p className="project-description">{project.description}</p>
        </section>
        <aside>
          <h2>Built with</h2>
          <div className="project-stack">
            {project.stack.map((technology) => (
              <span key={technology} className="tag">
                {technology}
              </span>
            ))}
          </div>
          <h2>Launched</h2>
          <p>
            {new Date(project.published_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </aside>
      </div>
    </div>
  );
}
