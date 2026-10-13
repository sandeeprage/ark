"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { reportContent } from "@/modules/moderation/actions";
export function ReportButton({
  kind,
  target,
  path,
  access,
}: {
  kind: "project" | "maker";
  target: string;
  path: string;
  access: "anonymous" | "active" | "restricted";
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<{ error?: string; success?: string }, FormData>(
    async (_previous, form) =>
      reportContent({ kind, target, reason: form.get("reason"), details: form.get("details") }),
    {},
  );
  if (access === "anonymous")
    return (
      <Link className="text-link" href={`/login?next=${encodeURIComponent(path)}`}>
        Sign in to report
      </Link>
    );
  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <Dialog.Trigger asChild>
          <button className="button button-outline" disabled={access !== "active"}>
            Report
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content className="delete-dialog">
            <Dialog.Title>Report this {kind}</Dialog.Title>
            <Dialog.Description>
              Reports are private. Explain the concern so an administrator can review it. For urgent
              concerns, contact arkragesupport@gmail.com.
            </Dialog.Description>
            {state.success ? (
              <p role="status">{state.success}</p>
            ) : (
              <form action={action}>
                <fieldset disabled={pending}>
                  <label className="form-field">
                    Reason
                    <select name="reason" required>
                      <option value="spam">Spam or manipulation</option>
                      <option value="harassment">Harassment or abuse</option>
                      <option value="unsafe">Malware or unsafe links</option>
                      <option value="rights">Rights or copyright concern</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="form-field">
                    Details
                    <textarea name="details" minLength={10} maxLength={2000} required rows={5} />
                  </label>
                  {state.error && <p role="alert">{state.error}</p>}
                  <button className="button button-primary">
                    {pending ? "Submitting…" : "Submit report"}
                  </button>
                </fieldset>
              </form>
            )}
            <Dialog.Close asChild>
              <button className="button button-outline" disabled={pending}>
                Close report
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
