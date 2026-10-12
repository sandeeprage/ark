import { Github, LogOut } from "lucide-react";
import { requireViewer } from "@/modules/auth/session";
import { signOut } from "@/modules/auth/actions";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Settings" };
export default async function Settings() {
  const viewer = await requireViewer("/settings");
  return (
    <div className="page narrow-page">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Settings</h1>
      <p className="page-description">A little about you. A home for your work.</p>
      <section className="settings-section">
        <h2>Public profile</h2>
        <ProfileForm profile={viewer.profile} />
      </section>
      <section className="settings-section">
        <h2>Connected identity</h2>
        <div className="identity-row">
          <Github size={21} />
          <div>
            <strong>
              {viewer.profile?.github_connected_at
                ? `@${viewer.profile.github_username}`
                : "GitHub isn’t connected"}
            </strong>
            <p>
              {viewer.profile?.github_connected_at
                ? "Authenticated GitHub connection. Repository ownership is verified separately."
                : "You can use ARK with your current login identity."}
            </p>
          </div>
        </div>
        <p className="form-note">
          Identity linking, notification preferences, and account erasure are scheduled for later
          internal milestones.
        </p>
      </section>
      <section className="settings-section">
        <form action={signOut}>
          <button className="button button-outline">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
