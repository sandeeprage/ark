import Link from "next/link";
export const metadata = { title: "Account deletion requested" };
export default function AccountDeleted() {
  return (
    <main className="page narrow-page information-page">
      <h1>Account deletion requested.</h1>
      <p className="page-description">
        Your public content is hidden and you have been signed out. Removal of account records and
        media is queued; failed cleanup will be retried.
      </p>
      <p className="form-note">
        Questions? <a href="mailto:arkragesupport@gmail.com">arkragesupport@gmail.com</a>
      </p>
      <Link className="button button-outline" href="/explore">
        Back to Explore
      </Link>
    </main>
  );
}
