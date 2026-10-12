"use client";
import { useFormStatus } from "react-dom";
import { Github, ArrowUpRight } from "lucide-react";
export function OAuthButtons({ github, google }: { github: boolean; google: boolean }) {
  const { pending, data } = useFormStatus();
  const selected = data?.get("provider");
  return (
    <>
      <button
        name="provider"
        value="github"
        className="button button-primary"
        disabled={pending || !github}
      >
        <Github size={19} />
        {pending && selected === "github" ? "Opening GitHub…" : "Continue with GitHub"}
        <ArrowUpRight size={16} />
      </button>
      <button
        name="provider"
        value="google"
        className="button button-outline"
        disabled={pending || !google}
      >
        <span aria-hidden="true">G</span>
        {pending && selected === "google" ? "Opening Google…" : "Continue with Google"}
        <ArrowUpRight size={16} />
      </button>
    </>
  );
}
