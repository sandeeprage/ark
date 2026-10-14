import { requireViewer } from "@/modules/auth/session";
import { ProjectForm } from "@/components/project-form";
import { getCatalogs } from "@/modules/discovery/queries";
import { isStorageConfigured } from "@/lib/supabase/admin";
import { importConfig } from "@/modules/projects/github-import";
export const metadata = { title: "Publish a project" };
export default async function Publish() {
  const viewer = await requireViewer("/publish");
  const catalogs = await getCatalogs();
  const githubApp = importConfig();
  return (
    <div className="page publish-page">
      <p className="eyebrow">BUILT. SHIPPED. READY TO SHARE.</p>
      <h1>Give your work a home.</h1>
      <p className="page-description">
        One page. Everything people need to discover and try your project.
      </p>
      <ProjectForm
        {...catalogs}
        storageReady={isStorageConfigured()}
        githubConnected={Boolean(viewer.profile?.github_connected_at)}
        githubImportAvailable={Boolean(githubApp)}
        githubAppSlug={githubApp?.slug ?? ""}
      />
    </div>
  );
}
