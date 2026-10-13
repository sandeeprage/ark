"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { ProjectCard } from "./project-card";
import { appendUniqueProjects, feedSignature } from "@/modules/discovery/feed-state";
import type { ProjectSummary } from "@/modules/discovery/queries";

type Page = { projects: ProjectSummary[]; nextUrl: string | null; signature: string };
export function ProjectFeed({
  initial,
  initialNextUrl,
  headUrl,
  grid = true,
}: {
  initial: ProjectSummary[];
  initialNextUrl: string | null;
  headUrl: string;
  grid?: boolean;
}) {
  const [projects, setProjects] = useState(initial);
  const [nextUrl, setNextUrl] = useState(initialNextUrl);
  const [pending, setPending] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState("");
  const signature = useRef(feedSignature(initial));
  const busy = useRef(false);
  const generation = useRef(0);
  const voteRevision = useRef(0);
  const needsVoteBaseline = useRef(false);
  async function read(url: string): Promise<Page> {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Projects couldn’t be loaded. Try again.");
    return response.json();
  }
  useEffect(() => {
    let active = true;
    let checking = false;
    let lastCheck = Date.now();
    const lifecycle = generation;
    async function check() {
      if (!active || checking || busy.current || document.hidden || Date.now() - lastCheck < 15000)
        return;
      checking = true;
      lastCheck = Date.now();
      const revision = voteRevision.current;
      try {
        const page = await read(headUrl);
        if (!active || revision !== voteRevision.current) return;
        if (needsVoteBaseline.current) {
          signature.current = page.signature;
          needsVoteBaseline.current = false;
        } else if (page.signature !== signature.current) setChanged(true);
      } catch {
        /* Background refresh checks do not interrupt browsing. */
      } finally {
        checking = false;
      }
    }
    function vote(event: Event) {
      const detail = (event as CustomEvent<{ id: string; count: number; upvoted: boolean }>).detail;
      setProjects((rows) =>
        rows.map((p) =>
          p.id === detail.id
            ? { ...p, upvote_count: detail.count, viewer_upvoted: detail.upvoted }
            : p,
        ),
      );
      // The successful vote already updated its card. Acknowledge the new
      // server order quietly, without moving cards while someone is browsing.
      const revision = ++voteRevision.current;
      needsVoteBaseline.current = true;
      void read(headUrl)
        .then((page) => {
          if (!active || revision !== voteRevision.current) return;
          signature.current = page.signature;
          needsVoteBaseline.current = false;
        })
        .catch(() => {
          // The next successful background check will establish the baseline.
        });
    }
    const timer = setInterval(check, 60000);
    window.addEventListener("focus", check);
    window.addEventListener("ark:vote-changed", vote);
    return () => {
      active = false;
      lifecycle.current++;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("ark:vote-changed", vote);
    };
  }, [headUrl]);
  async function load(refresh = false) {
    if (busy.current) return;
    const url = refresh ? headUrl : nextUrl;
    if (!url) return;
    busy.current = true;
    const version = generation.current;
    const revision = voteRevision.current;
    setPending(true);
    setError("");
    try {
      const page = await read(url);
      if (version !== generation.current) return;
      if (refresh) {
        setProjects(page.projects);
        signature.current = page.signature;
        setChanged(false);
      } else {
        setProjects((rows) => appendUniqueProjects(rows, page.projects));
        if (
          !needsVoteBaseline.current &&
          revision === voteRevision.current &&
          signature.current !== page.signature
        )
          setChanged(true);
      }
      setNextUrl(page.nextUrl);
    } catch (e) {
      if (version === generation.current)
        setError(e instanceof Error ? e.message : "Check your connection and try again.");
    } finally {
      busy.current = false;
      if (version === generation.current) setPending(false);
    }
  }
  const first = grid ? projects.slice(0, 6) : [];
  const rest = grid ? projects.slice(6) : projects;
  return (
    <>
      {changed && (
        <div className="feed-refresh" role="status">
          <span>The feed has changed. Refresh to see the current order.</span>
          <button
            type="button"
            className="button button-outline"
            disabled={pending}
            onClick={() => load(true)}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      )}
      <div className="project-grid">
        {first.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      <div className="project-list">
        {rest.map((project) => (
          <ProjectCard key={project.id} project={project} compact />
        ))}
      </div>
      {error && (
        <p role="alert" className="upvote-error">
          {error}
        </p>
      )}
      <p className="feed-result-count" role="status">
        {projects.length} projects loaded
      </p>
      {nextUrl && (
        <button
          type="button"
          className="button button-outline load-more"
          disabled={pending}
          onClick={() => load()}
        >
          {pending ? "Loading…" : "Load more"}
          <ArrowRight size={16} />
        </button>
      )}
    </>
  );
}
