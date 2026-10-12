"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import { setProjectUpvote } from "@/modules/discovery/actions";
import type { VoteAccess } from "@/modules/discovery/votes";

export function UpvoteButton({
  id,
  count,
  upvoted = false,
  access = "anonymous",
  compact = false,
}: {
  id: string;
  count: number;
  upvoted?: boolean;
  access?: VoteAccess;
  compact?: boolean;
}) {
  const [state, setState] = useState({ count, upvoted });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  useEffect(() => {
    if (!busy.current) setState({ count, upvoted });
  }, [count, upvoted]);
  const className = compact ? "vote-count upvote-button" : "button button-outline upvote-button";
  if (access === "anonymous")
    return (
      <Link
        className={className}
        href={`/login?next=${encodeURIComponent(`/projects/${id}`)}`}
        aria-label={`Sign in to upvote · ${state.count} upvotes`}
      >
        <ArrowUp size={16} />
        {state.count}
        {!compact && " upvotes"}
      </Link>
    );
  return (
    <div className="upvote-control">
      <button
        className={className}
        type="button"
        aria-pressed={state.upvoted}
        aria-label={`${state.upvoted ? "Remove upvote" : "Upvote"} · ${state.count} upvotes`}
        disabled={pending || access !== "active"}
        title={
          access === "owner"
            ? "You can’t upvote your own project"
            : access === "restricted"
              ? "Complete onboarding with an active account to upvote"
              : undefined
        }
        onClick={() => {
          if (busy.current) return;
          busy.current = true;
          const before = state;
          const desired = !state.upvoted;
          setError("");
          setState({ upvoted: desired, count: Math.max(0, state.count + (desired ? 1 : -1)) });
          startTransition(async () => {
            try {
              const result = await setProjectUpvote(id, desired);
              if (result.ok) {
                setState(result.data);
                window.dispatchEvent(
                  new CustomEvent("ark:vote-changed", { detail: { id, ...result.data } }),
                );
              } else {
                setState(before);
                setError(result.error);
              }
            } catch {
              setState(before);
              setError("Check your connection and try again.");
            } finally {
              busy.current = false;
            }
          });
        }}
      >
        <ArrowUp size={16} />
        {state.count}
        {!compact && " upvotes"}
      </button>
      {error && (
        <span role="alert" className="upvote-error">
          {error}
        </span>
      )}
    </div>
  );
}
