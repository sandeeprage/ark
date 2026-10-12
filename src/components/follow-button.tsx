"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setMakerFollow } from "@/modules/following/actions";
import type { FollowState } from "@/modules/following/queries";
export function FollowButton({
  id,
  username,
  initial,
  access,
}: {
  id: string;
  username: string;
  initial: FollowState;
  access: "active" | "anonymous" | "restricted";
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  useEffect(() => {
    if (!busy.current) setState(initial);
  }, [initial]);
  if (access === "anonymous")
    return (
      <Link
        className="button button-outline"
        href={`/login?next=${encodeURIComponent(`/makers/${username}`)}`}
      >
        Sign in to follow
      </Link>
    );
  return (
    <div className="follow-control">
      <button
        type="button"
        className="button button-outline"
        disabled={pending || access !== "active"}
        aria-pressed={state.followed}
        onClick={() => {
          if (busy.current) return;
          busy.current = true;
          const before = state;
          const desired = !state.followed;
          setError("");
          setState({
            ...state,
            followed: desired,
            followers: Math.max(0, state.followers + (desired ? 1 : -1)),
          });
          startTransition(async () => {
            try {
              const result = await setMakerFollow(id, desired);
              if (result.ok) setState(result.data);
              else {
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
        {pending ? "Saving…" : state.followed ? "Unfollow" : "Follow"}
      </button>
      <span role="status" className="sr-only">
        {state.followers} followers
      </span>
      {access === "restricted" && <p>Complete onboarding to follow makers.</p>}
      {error && (
        <p role="alert" className="upvote-error">
          {error}
        </p>
      )}
    </div>
  );
}
