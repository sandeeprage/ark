import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { redirect } from "next/navigation";
import { getViewer } from "@/modules/auth/session";
import { safeReturnPath } from "@/modules/auth/validation";
import { signIn } from "@/modules/auth/actions";
import { getAuthProviders } from "@/modules/auth/providers";
import type { SearchParams } from "@/modules/discovery/filters";
import {
  signInErrorMessage,
  configuredAuthOrigin,
  loginDestination,
} from "@/modules/auth/redirects";
import { headers } from "next/headers";
import { OAuthButtons } from "@/components/oauth-buttons";

export const metadata = { title: "Sign in" };
export default async function Login({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const next = safeReturnPath(params.next);
  const origin = configuredAuthOrigin();
  if (origin && (await headers()).get("host") !== new URL(origin).host) {
    const error =
      typeof params.error === "string" && /^[a-z_]{1,32}$/.test(params.error)
        ? params.error
        : undefined;
    redirect(loginDestination(origin, next, error).toString());
  }
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
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-mark" aria-label="ARK home">
          <Layers3 size={30} strokeWidth={1.4} />
        </Link>
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
            {signInErrorMessage(params.error)}
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
          <OAuthButtons github={providers.github} google={providers.google} />
        </form>
        <p className="auth-note">
          {providers.google
            ? "GitHub connection is optional with Google."
            : "Complete sign-in in the same browser where you started."}
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
    </main>
  );
}
