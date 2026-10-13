import { EmptyState } from "@/components/empty-state";
export const metadata = { title: "Page unavailable" };
export default function NotFound() {
  return (
    <div className="page">
      <h1>Page unavailable</h1>
      <EmptyState
        title="This page isn’t available."
        description="The link may have changed, or the content is no longer public."
        action={{ label: "Back to Explore", href: "/explore" }}
      />
    </div>
  );
}
