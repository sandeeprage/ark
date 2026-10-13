import Link from "next/link";
export const metadata = { title: "Service information" };
export default function Status() {
  return (
    <main className="page narrow-page information-page">
      <Link className="text-link" href="/">
        ARK home →
      </Link>
      <h1>Service information</h1>
      <p className="page-description">
        Check service announcements and the providers that power ARK.
      </p>
      <section>
        <h2>ARK announcements</h2>
        <p>
          {process.env.ARK_MAINTENANCE_MESSAGE ||
            "No maintenance announcement is configured. This page does not provide automatic uptime monitoring."}
        </p>
        {process.env.ARK_MAINTENANCE_UNTIL && (
          <p>Estimated return: {process.env.ARK_MAINTENANCE_UNTIL}</p>
        )}
      </section>
      <section>
        <h2>Provider status</h2>
        <p>These independently hosted pages remain available if ARK cannot load.</p>
        <p>
          <a
            className="text-link"
            href="https://status.supabase.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase status ↗
          </a>
        </p>
        <p>
          <a
            className="text-link"
            href="https://www.vercel-status.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel status ↗
          </a>
        </p>
      </section>
      <section>
        <h2>Support</h2>
        <a className="text-link" href="mailto:arkragesupport@gmail.com">
          arkragesupport@gmail.com
        </a>
      </section>
    </main>
  );
}
