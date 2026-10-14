import { notFound } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/modules/auth/session";
import { getMyProject } from "@/modules/projects/management";
import { getCatalogs } from "@/modules/discovery/queries";
import { isStorageConfigured } from "@/lib/supabase/admin";
import { ProjectForm } from "@/components/project-form";
import Link from "next/link";

export const metadata = { title: "Edit project" };
export default async function Edit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const viewer = await requireViewer(`/projects/${id}/edit`);
  const [initial, catalogs] = await Promise.all([getMyProject(id), getCatalogs()]);
  if (!initial || !["published", "hidden"].includes(initial.status)) notFound();
  const saved = (await searchParams).saved === "1";
  return (
    <div className="page publish-page">
      <p className="eyebrow">YOUR WORK, KEPT CURRENT</p>
      <h1>Edit {initial.name}</h1>
      <p className="page-description">
        Update the details and screenshots. Your original launch date stays the same.
      </p>
      {saved && (
        <p className="notice" role="status">
          {initial.status === "hidden"
            ? "Changes saved. This project remains hidden."
            : "Changes saved."}
        </p>
      )}
      {initial.status === "published" && (
        <Link className="text-link" href={`/projects/${id}`}>
          View project →
        </Link>
      )}
      <ProjectForm
        key={`${viewer.id}:${id}:${initial.version}`}
        viewerId={viewer.id}
        {...catalogs}
        initial={initial}
        storageReady={isStorageConfigured()}
      />
    </div>
  );
}
