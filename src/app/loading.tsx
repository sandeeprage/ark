export default function Loading() {
  return (
    <div className="page route-loading" role="status" aria-label="Loading page">
      <span className="sr-only">Loading page</span>
      <div className="route-placeholder" aria-hidden="true">
        <div className="route-placeholder-label" />
        <div className="route-placeholder-heading" />
        <div className="route-placeholder-description" />
        <div className="route-placeholder-content" />
      </div>
    </div>
  );
}
