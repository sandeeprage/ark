import { Github, LogOut } from "lucide-react";
import { requireViewer } from "@/modules/auth/session";
import { signOut } from "@/modules/auth/actions";
import { ProfileForm } from "@/components/profile-form";
import { NotificationPreferences } from "@/components/notification-controls";
import { notificationPreferences } from "@/modules/notifications/queries";
import { createClient } from "@/lib/supabase/server";
import { recentlyAuthenticated, usableIdentities } from "@/modules/auth/account-validation";
import { AccountConnections, AccountDangerZone } from "@/components/account-controls";
import { AvatarForm } from "@/components/avatar-form";
import Link from "next/link";
import { signInErrorMessage } from "@/modules/auth/redirects";

export const metadata = { title: "Settings" };
export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ connection_error?: string }>;
}) {
  const viewer = await requireViewer("/settings");
  const preferences = await notificationPreferences();
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const providers = usableIdentities(user?.identities ?? []).map((identity) => identity.provider);
  const recent = recentlyAuthenticated(user?.last_sign_in_at);
  const admin = await (await createClient()).rpc("my_admin_access");
  const connectionError = (await searchParams).connection_error;
  const reports = await (await createClient()).rpc("get_my_report_statuses");
  return (
    <div className="page narrow-page">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Settings</h1>
      <p className="page-description">A little about you. A home for your work.</p>
      {connectionError && (
        <p role="alert" className="notice notice-error">
          Account connection was not completed. {signInErrorMessage(connectionError)}
        </p>
      )}
      {admin.data === true && (
        <Link className="button button-outline" href="/admin">
          Moderation administration
        </Link>
      )}
      <section className="settings-section">
        <h2>Public profile</h2>
        <AvatarForm
          id={viewer.id}
          name={viewer.profile!.display_name}
          hasAvatar={viewer.profile?.has_avatar}
          version={viewer.profile?.avatar_version}
          providers={providers}
        />
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
        <AccountConnections providers={providers} recent={recent} />
      </section>
      <section className="settings-section">
        <h2>Notification preferences</h2>
        <NotificationPreferences initial={preferences} />
      </section>
      <section className="settings-section">
        <form action={signOut}>
          <button className="button button-outline">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </section>
      <AccountDangerZone
        username={viewer.profile!.username!}
        providers={providers}
        recent={recent}
      />
      {!reports.error && reports.data?.length > 0 && (
        <section className="settings-section">
          <h2>Your recent reports</h2>
          <p className="form-note">
            Only you and authorized administrators can see your submitted reports.
          </p>
          <ul>
            {(
              reports.data as { id: string; target_kind: string; reason: string; status: string }[]
            ).map((report) => (
              <li key={report.id}>
                {report.target_kind} · {report.reason} · {report.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
