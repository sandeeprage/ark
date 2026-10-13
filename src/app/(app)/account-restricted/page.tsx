import { signOut } from "@/modules/auth/actions";
export const metadata = { title: "Account access" };
export default function Restricted() {
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
    </div>
  );
}
