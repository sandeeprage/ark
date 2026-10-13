import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/modules/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ModerationForm } from "@/components/moderation-form";
import { z } from "zod";
export const metadata = { title: "Moderation" };
type Report = {
  id: string;
  target_kind: string;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; after_id?: string }>;
}) {
  await requireViewer("/settings");
  const client = await createClient();
  const access = await client.rpc("my_admin_access");
  if (access.error || access.data !== true) notFound();
  const raw = await searchParams;
  const cursor = z
    .object({ after: z.iso.datetime({ offset: true }), after_id: z.uuid() })
    .safeParse(raw);
  const [reports, audit] = await Promise.all([
    client.rpc(
      "list_content_reports",
      cursor.success ? { p_after: cursor.data.after, p_after_id: cursor.data.after_id } : {},
    ),
    client.rpc("list_moderation_audit"),
  ]);
  if (reports.error || audit.error) throw new Error("Moderation could not be loaded.");
  const rows = (reports.data ?? []) as Report[];
  const last = rows[49];
  return (
    <div className="page narrow-page information-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Moderation</h1>
      <p className="page-description">
        Reports, newest first, and the 50 most recent decisions. Reports and this audit are private
        to authorized administrators.
      </p>
      {rows.slice(0, 50).map((report) => (
        <section key={report.id}>
          <h2>
            {report.target_kind} report · {report.status}
          </h2>
          <p>
            {report.reason} ·{" "}
            <time dateTime={report.created_at}>
              {new Date(report.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
              IST
            </time>
          </p>
          <p>{report.details}</p>
          {report.target_kind === "project" && (
            <Link className="text-link" href={`/projects/${report.target_id}`}>
              View project →
            </Link>
          )}
          <p className="form-note">Target ID: {report.target_id}</p>
          <ModerationForm id={report.id} kind={report.target_kind} />
        </section>
      ))}
      {!rows.length && <p className="notice">No reports on this page.</p>}
      {rows.length > 50 && (
        <Link
          className="button button-outline"
          href={`/admin?${new URLSearchParams({ after: last.created_at, after_id: last.id })}`}
        >
          Older reports
        </Link>
      )}
      <section>
        <h2>Recent decisions</h2>
        {(
          (audit.data ?? []) as { id: string; action: string; reason: string; created_at: string }[]
        ).map((entry) => (
          <article key={entry.id}>
            <strong>{entry.action}</strong>
            <p>{entry.reason}</p>
            <time dateTime={entry.created_at}>
              {new Date(entry.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </time>
          </article>
        ))}
      </section>
    </div>
  );
}
