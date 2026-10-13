"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { Verification } from "@/modules/projects/verification";

const explanation =
  "Checks that this public repository was personally owned by the maker’s authenticated GitHub account on the date shown. It does not establish authorship, originality, or quality; forks can also be verified. Checks expire after 90 days.";
export function RepositoryVerification({
  id,
  verification,
  owner,
  connected,
}: {
  id: string;
  verification: Verification | null;
  owner: boolean;
  connected: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function check() {
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const response = await fetch(`/api/projects/${id}/verify-repository`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setFailed(true);
        setMessage(data.error || "The check couldn’t be completed.");
      } else
        setMessage(
          data.state === "verified"
            ? "Repository ownership verified."
            : "Ownership wasn’t verified. Use a public personal repository owned by your connected GitHub account. If it was renamed, update the link first.",
        );
      router.refresh();
    } catch {
      setFailed(true);
      setMessage("The check couldn’t be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!owner && verification?.state !== "verified") return null;
  return (
    <section className="repository-verification" aria-label="Repository ownership">
      {verification?.state === "verified" && (
        <p className="repository-verified" title={explanation}>
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>
            Repository owner verified ·{" "}
            {new Date(verification.checked_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </span>
        </p>
      )}
      <details>
        <summary>What does ownership verification mean?</summary>
        <p>{explanation}</p>
      </details>
      {owner && (
        <>
          <button className="button button-outline" onClick={check} disabled={busy || !connected}>
            {busy
              ? "Checking ownership…"
              : verification
                ? "Recheck ownership"
                : "Check repository ownership"}
          </button>
          {!connected && (
            <p className="form-note">
              A connected GitHub identity is required. Publishing remains available without
              verification.
            </p>
          )}
          {verification?.state === "expired" && (
            <p className="form-note">
              The previous check expired. Recheck to display verification again.
            </p>
          )}
          {message && (
            <p className={failed ? "field-error" : "form-note"} role={failed ? "alert" : "status"}>
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
