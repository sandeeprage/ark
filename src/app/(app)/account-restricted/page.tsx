import { signOut } from "@/modules/auth/actions";
import { getViewer } from "@/modules/auth/session";
import { createClient } from "@/lib/supabase/server";
import { recentlyAuthenticated, usableIdentities } from "@/modules/auth/account-validation";
import { AccountDangerZone } from "@/components/account-controls";
export const metadata = { title: "Account access" };
export default async function Restricted() {
  const viewer = await getViewer();
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return (
    <div className="page narrow-page">
      <p className="eyebrow">ACCOUNT ACCESS</p>
      <h1>Your account is restricted.</h1>
      <p className="page-description">
        Your account cannot make changes right now. If account access could not be verified, try
        signing in again.
      </p>
      <form action={signOut}>
        <button className="button button-primary">Sign out</button>
      </form>
      {viewer?.status === "suspended" && (
        <AccountDangerZone
          username={viewer.profile?.username ?? "DELETE"}
          providers={usableIdentities(user?.identities ?? []).map((identity) => identity.provider)}
          recent={recentlyAuthenticated(user?.last_sign_in_at)}
        />
      )}
    </div>
  );
}
