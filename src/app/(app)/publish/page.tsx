import { requireViewer } from "@/modules/auth/session";
import { ProjectForm } from "@/components/project-form";
import { getCatalogs } from "@/modules/discovery/queries";
import { isStorageConfigured } from "@/lib/supabase/admin";
export const metadata = { title: "Publish a project" };
export default async function Publish() {
  await requireViewer("/publish");
  const catalogs = await getCatalogs();
  return (
    <div className="page publish-page">
      <p className="eyebrow">BUILT. SHIPPED. READY TO SHARE.</p>
      <h1>Give your work a home.</h1>
      <p className="page-description">
        One page. Everything people need to discover and try your project.
      </p>
      <ProjectForm {...catalogs} storageReady={isStorageConfigured()} />
    </div>
  );
}
