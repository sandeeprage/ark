import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getPublicProfile } from "@/modules/profiles/queries";
import { listConnections } from "@/modules/following/queries";
import { EmptyState } from "./empty-state";
export async function MakerConnections({
  username,
  direction,
  after,
}: {
  username: string;
  direction: "followers" | "following";
  after?: string | string[];
}) {
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  const cursor = typeof after === "string" && z.uuid().safeParse(after).success ? after : null;
  const result = await listConnections(profile.id, direction, cursor);
  const path = `/makers/${username}/${direction}`;
  return (
    <div className="page">
      <Link className="text-link" href={`/makers/${username}`}>
        Back to @{username}
      </Link>
      <div className="page-heading">
        <div>
          <h1>{direction === "followers" ? "Followers" : "Following"}</h1>
          <p className="page-description">@{username}’s maker community</p>
        </div>
      </div>
      {result.error ? (
        <EmptyState
          kind="error"
          title="Makers couldn’t be loaded."
          description="Try refreshing this page."
          action={{ label: "Try again", href: path }}
        />
      ) : !result.makers.length ? (
        <EmptyState
          title={direction === "followers" ? "No followers yet." : "No makers followed yet."}
          description="Discover people through their shipped projects."
          action={{ label: "Explore projects", href: "/explore" }}
        />
      ) : (
        <ul className="connection-list">
          {result.makers.map((maker) => (
            <li key={maker.id}>
              <Link href={`/makers/${maker.username}`}>
                <strong>{maker.display_name}</strong>
                <span className="username">@{maker.username}</span>
              </Link>
              <p>{maker.bio || "A maker on ARK."}</p>
            </li>
          ))}
        </ul>
      )}
      {result.next && (
        <Link className="button button-outline" href={`${path}?after=${result.next}`}>
          Load more
        </Link>
      )}
    </div>
  );
}
