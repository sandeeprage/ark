import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getCollection, collectionProjects } from "@/modules/collections/queries";
import { ProjectCard } from "@/components/project-card";
import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "Public collection" };
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ after?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const collection = await getCollection(id);
  if (!collection) notFound();
  let after: { added: string; id: string } | null = null;
  const raw = (await searchParams).after;
  if (raw && raw.length < 400)
    try {
      const parsed = z
        .object({ added: z.iso.datetime({ offset: true }), id: z.uuid() })
        .safeParse(JSON.parse(Buffer.from(raw, "base64url").toString()));
      if (parsed.success) after = parsed.data;
    } catch {}
  const result = await collectionProjects(id, after);
  return (
    <div className="page">
      <p className="eyebrow">PUBLIC COLLECTION — ANYONE CAN VIEW THIS</p>
      <h1>{collection.title}</h1>
      <p className="page-description">{collection.description}</p>
      <Link className="text-link" href={`/makers/${collection.maker_username}`}>
        Curated by @{collection.maker_username}
      </Link>
      {result.projects.length ? (
        <div className="project-grid">
          {result.projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing collected here yet."
          description="This collection will show the public projects its maker saves."
          action={{ label: "Explore projects", href: "/explore" }}
        />
      )}
      {result.next && (
        <Link
          className="button button-outline"
          href={`/collections/${id}?after=${Buffer.from(JSON.stringify(result.next)).toString("base64url")}`}
        >
          Load more
        </Link>
      )}
    </div>
  );
}
