"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page narrow-page">
      <h1>Something didn’t load.</h1>
      <p className="page-description">Check your connection and try again.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
      <p className="form-note">
        <Link href="/status">Service information</Link> ·{" "}
        <a href="mailto:arkragesupport@gmail.com">Contact support</a>
      </p>
    </div>
  );
}
