import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Box } from "lucide-react";
import { UpvoteButton } from "./upvote-button";
import type { ProjectSummary } from "@/modules/discovery/queries";

export function ProjectCard({
  project,
  compact = false,
}: {
  project: ProjectSummary;
  compact?: boolean;
}) {
  return (
    <article className={compact ? "project-row" : "project-card"}>
      <Link
        className="project-cover"
        href={`/projects/${project.id}`}
        aria-label={`View ${project.name}`}
      >
        {project.cover ? (
          <Image
            src={project.cover.url}
            alt={project.cover.alt_text}
            width={project.cover.width}
            height={project.cover.height}
            unoptimized
          />
        ) : (
          <>
            <Box size={32} strokeWidth={1.2} />
            <span>{project.category}</span>
          </>
        )}
      </Link>
      <div className="project-card-body">
        <div className="project-card-heading">
          <Link href={`/projects/${project.id}`}>
            <h3>{project.name}</h3>
          </Link>
          <ArrowUpRight size={15} aria-hidden="true" />
        </div>
        <p>{project.tagline}</p>
        <div className="project-card-footer">
          <Link href={`/makers/${project.maker_username}`} className="maker-link">
            <span className="avatar avatar-small">
              {project.maker_name.slice(0, 1).toUpperCase()}
            </span>
            <span>@{project.maker_username}</span>
          </Link>
          <UpvoteButton
            id={project.id}
            count={project.upvote_count}
            upvoted={project.viewer_upvoted}
            access={project.vote_access}
            compact
          />
        </div>
      </div>
    </article>
  );
}
