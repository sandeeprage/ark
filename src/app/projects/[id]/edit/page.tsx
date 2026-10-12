import { notFound } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/modules/auth/session";
import { getMyProject } from "@/modules/projects/management";
import { getCatalogs } from "@/modules/discovery/queries";
import { isStorageConfigured } from "@/lib/supabase/admin";
import { ProjectForm } from "@/components/project-form";

export const metadata = { title: "Edit project" };
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireViewer(`/projects/${id}/edit`);
  const [initial, catalogs] = await Promise.all([getMyProject(id), getCatalogs()]);
  if (!initial || !["published", "hidden"].includes(initial.status)) notFound();
  return (
    <div className="page publish-page">
      <p className="eyebrow">YOUR WORK, KEPT CURRENT</p>
      <h1>Edit {initial.name}</h1>
      <p className="page-description">
        Update the details and screenshots. Your original launch date stays the same.
      </p>
      <ProjectForm
        key={`${id}:${initial.version}`}
        {...catalogs}
        initial={initial}
        storageReady={isStorageConfigured()}
      />
    </div>
  );
}
