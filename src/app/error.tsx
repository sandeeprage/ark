"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page narrow-page">
      <h1>Something didn’t load.</h1>
      <p className="page-description">Check your connection and try again.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
