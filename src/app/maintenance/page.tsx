import Link from "next/link";
export const metadata = { title: "Maintenance" };
export default function Maintenance() {
  return (
    <main className="page narrow-page information-page">
      <h1>ARK is undergoing maintenance.</h1>
      <p className="page-description">
        {process.env.ARK_MAINTENANCE_MESSAGE ||
          "We’re working on the service. Please try again later."}
      </p>
      <section>
        <h2>When will it return?</h2>
        <p>
          {process.env.ARK_MAINTENANCE_UNTIL ||
            "There is no confirmed restoration time yet. Updates will appear on the service information page."}
        </p>
      </section>
      <Link className="button button-outline" href="/status">
        Service information
      </Link>
      <p className="form-note">
        Urgent question? <a href="mailto:arkragesupport@gmail.com">arkragesupport@gmail.com</a>
      </p>
    </main>
  );
}
