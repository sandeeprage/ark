import { requireViewer } from "@/modules/auth/session";
import { listCollections } from "@/modules/collections/queries";
import { CollectionManager } from "@/components/collection-manager";
export const metadata = { title: "Collections" };
export default async function Collections() {
  const viewer = await requireViewer("/collections");
  const collections = await listCollections(viewer.id);
  return (
    <div className="page narrow-page">
      <p className="eyebrow">YOUR PUBLIC LIBRARY</p>
      <h1>Collections</h1>
      <p className="page-description">Curate the projects that speak to you.</p>
      <CollectionManager collections={collections} />
    </div>
  );
}
