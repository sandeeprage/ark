import { requireViewer } from "@/modules/auth/session";
import Link from "next/link";
import { z } from "zod";
import { notificationPage, notificationStatus } from "@/modules/notifications/queries";
import { MarkRead } from "@/components/notification-controls";
import { EmptyState } from "@/components/empty-state";
import { NotificationRefresh } from "@/components/notification-refresh";
export const metadata = { title: "Notifications" };
export default async function Notifications({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  await requireViewer("/notifications");
  let after: { date: string; id: string } | null = null;
  const raw = (await searchParams).after;
  if (raw && raw.length < 400)
    try {
      const parsed = z
        .object({ date: z.iso.datetime({ offset: true }), id: z.uuid() })
        .safeParse(JSON.parse(Buffer.from(raw, "base64url").toString()));
      if (parsed.success) after = parsed.data;
    } catch {}
  const [result, status] = await Promise.all([notificationPage(after), notificationStatus()]);
  return (
    <div className="page narrow-page">
      <NotificationRefresh />
      <p className="eyebrow">JUST FOR YOU</p>
      <h1>Notifications</h1>
      <p className="page-description">Follows, upvotes, and launches from your makers.</p>
      <div className="results-heading">
        <span>{status.unread} unread</span>
        {status.unread > 0 && <MarkRead cutoff={status.cutoff} />}
      </div>
      {result.items.length ? (
        <ul className="notification-list">
          {result.items.map((n) => (
            <li key={n.id} className={!n.read_at ? "unread" : ""}>
              <div>
                <p>
                  {!n.actor_username || (n.type !== "follow" && !n.project_id) ? (
                    "This notification’s maker or project is no longer available."
                  ) : (
                    <>
                      <Link href={`/makers/${n.actor_username}`}>@{n.actor_username}</Link>
                      {n.type === "follow"
                        ? " followed you."
                        : n.type === "upvote"
                          ? " upvoted "
                          : " launched "}
                      {n.project_id && (
                        <Link href={`/projects/${n.project_id}`}>{n.project_name}</Link>
                      )}
                    </>
                  )}
                </p>
                <time dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  IST
                </time>
                {!n.read_at && <span className="tag">Unread</span>}
              </div>
              {!n.read_at && <MarkRead id={n.id} />}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="You’re all caught up."
          description="New follows, upvotes, and launches will appear here."
        />
      )}
      {result.next && (
        <Link
          className="button button-outline"
          href={`/notifications?after=${Buffer.from(JSON.stringify(result.next)).toString("base64url")}`}
        >
          Load more
        </Link>
      )}
    </div>
  );
}
