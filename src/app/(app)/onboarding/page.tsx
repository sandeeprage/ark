import { redirect } from "next/navigation";
import { Github } from "lucide-react";
import { getViewer } from "@/modules/auth/session";
import { safeReturnPath } from "@/modules/auth/validation";
import { ProfileForm } from "@/components/profile-form";
import type { SearchParams } from "@/modules/discovery/filters";
import { OptionalGitHubConnection, AccountDangerZone } from "@/components/account-controls";
import { recentlyAuthenticated, usableIdentities } from "@/modules/auth/account-validation";
import { createClient } from "@/lib/supabase/server";
import { signInErrorMessage } from "@/modules/auth/redirects";

export const metadata = { title: "Create your profile" };
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await getViewer();
  const next = safeReturnPath((await searchParams).next);
  const connectionError = (await searchParams).connection_error;
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (viewer.status !== "active") redirect("/account-restricted");
  if (viewer.profile?.username) redirect(next);
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return (
    <div className="page narrow-page">
      <p className="eyebrow">YOUR FIRST STEP</p>
      <h1>Let’s meet the maker.</h1>
      <p className="page-description">
        Review your imported details and choose a username.
        <br />
        This profile is public. You can edit it anytime.
      </p>
      {typeof connectionError === "string" && (
        <p className="notice notice-error" role="alert">
          Account connection was not completed. {signInErrorMessage(connectionError)}
        </p>
      )}
      {viewer.profile?.github_connected_at && (
        <p className="connection-label">
          <Github size={16} />
          Connected as @{viewer.profile.github_username}
        </p>
      )}
      {user?.identities?.some((identity) => identity.provider === "google") &&
        !user.identities.some((identity) => identity.provider === "github") && (
          <OptionalGitHubConnection next={next} />
        )}
      <ProfileForm profile={viewer.profile} onboarding next={next} />
      <AccountDangerZone
        username="DELETE"
        providers={usableIdentities(user?.identities ?? []).map((identity) => identity.provider)}
        recent={recentlyAuthenticated(user?.last_sign_in_at)}
      />
    </div>
  );
}
