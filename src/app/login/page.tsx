import Link from "next/link";
import { ArrowUpRight, Github, Layers3 } from "lucide-react";
import { redirect } from "next/navigation";
import { getViewer } from "@/modules/auth/session";
import { safeReturnPath } from "@/modules/auth/validation";
import { signIn } from "@/modules/auth/actions";
import { getAuthProviders } from "@/modules/auth/providers";
import type { SearchParams } from "@/modules/discovery/filters";

export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const viewer = await getViewer();
  if (viewer)
    redirect(
      viewer.status !== "active"
        ? "/account-restricted"
        : viewer.profile?.username
          ? next
          : `/onboarding?next=${encodeURIComponent(next)}`,
    );
  const providers = await getAuthProviders();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="auth-mark">
          <Layers3 size={30} strokeWidth={1.4} />
        </span>
        <p className="eyebrow">WELCOME TO ARK</p>
        <h1>
          Made something?
          <br />
          Make it known.
        </h1>
        <p className="page-description">
          Sign in to share your projects, follow makers,
          <br />
          and collect work that inspires you.
        </p>
        {params.error && (
          <p role="alert" className="notice notice-error">
            {params.error === "setup"
              ? "Sign-in configuration is incomplete."
              : "Sign-in wasn’t completed. You can try again."}
          </p>
        )}
        {providers.state === "setup" && (
          <div className="notice">
            OAuth is ready to connect. Add your Supabase project configuration to enable sign-in.
          </div>
        )}
        {providers.state === "error" && (
          <p className="notice" role="alert">
            Sign-in is temporarily unavailable. Please try again shortly.
          </p>
        )}
        {providers.state === "ready" && !providers.github && !providers.google && (
          <p className="notice">
            The database is connected. GitHub and Google sign-in need to be enabled in Supabase Auth
            before you can join.
          </p>
        )}
        <form action={signIn} className="oauth-buttons">
          <input type="hidden" name="next" value={next} />
          <button
            name="provider"
            value="github"
            className="button button-primary"
            disabled={!providers.github}
          >
            <Github size={19} />
            Continue with GitHub
            <ArrowUpRight size={16} />
          </button>
          <button
            name="provider"
            value="google"
            className="button button-outline"
            disabled={!providers.google}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4c-.3 1.3-1 2.4-2.1 3.1-1 .6-2 .9-3.3.9a6.2 6.2 0 1 1 4.1-10.8l3-3A10.3 10.3 0 1 0 12 22.3c6 0 9.6-4.2 9.6-10.1Z"
              />
            </svg>
            Continue with Google
            <ArrowUpRight size={16} />
          </button>
        </form>
        <p className="auth-note">
          GitHub connection is optional with Google.
          <br />
          Your profile and collections are public.
        </p>
        <div className="auth-divider" />
        <Link href="/explore" className="text-link">
          Just looking? Explore without an account
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <p className="auth-bottom">Your work speaks for itself. Give it a home.</p>
    </div>
  );
}
