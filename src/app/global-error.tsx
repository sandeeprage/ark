"use client";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui",
          margin: 0,
          padding: "64px 24px",
          background: "#141414",
          color: "#f5f5f5",
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1>ARK couldn’t load.</h1>
          <p>Your account or connection may be temporarily unavailable. Try again in a moment.</p>
          <button
            onClick={reset}
            style={{ padding: "12px 20px", font: "inherit", cursor: "pointer" }}
          >
            Try again
          </button>
          <p>
            <a href="/status">Service information</a> ·{" "}
            <a href="mailto:arkragesupport@gmail.com">Contact support</a>
          </p>
        </main>
      </body>
    </html>
  );
}
