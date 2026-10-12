"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
export function ShareButton({ title, url }: { title: string; url: string }) {
  const [message, setMessage] = useState("");
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setMessage("Link shared.");
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("Copy this project’s address from your browser to share it.");
    }
  }
  return (
    <div className="share-control">
      <button onClick={share} className="button button-outline">
        <Share2 size={16} />
        Share
      </button>
      <small aria-live="polite">{message}</small>
    </div>
  );
}
