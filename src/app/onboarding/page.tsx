import { redirect } from "next/navigation";
import { Github } from "lucide-react";
import { getViewer } from "@/modules/auth/session";
import { safeReturnPath } from "@/modules/auth/validation";
import { ProfileForm } from "@/components/profile-form";
import type { SearchParams } from "@/modules/discovery/filters";

export const metadata = { title: "Create your profile" };
export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.status !== "active") redirect("/account-restricted");
  const next = safeReturnPath((await searchParams).next);
  if (viewer.profile?.username) redirect(next);
  return (
    <div className="page narrow-page">
      <p className="eyebrow">YOUR FIRST STEP</p>
      <h1>Let’s meet the maker.</h1>
      <p className="page-description">
        Review your imported details and choose a username.
        <br />
        This profile is public. You can edit it anytime.
      </p>
      {viewer.profile?.github_connected_at && (
        <p className="connection-label">
          <Github size={16} />
          Connected as @{viewer.profile.github_username}
        </p>
      )}
      <ProfileForm profile={viewer.profile} onboarding next={next} />
    </div>
  );
}
