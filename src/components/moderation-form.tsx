"use client";
import { useActionState } from "react";
import { moderateReport } from "@/modules/moderation/actions";
export function ModerationForm({ id, kind }: { id: string; kind: string }) {
  const [state, action, pending] = useActionState<{ error?: string; success?: string }, FormData>(
    async (_previous, form) =>
      moderateReport({ id, action: form.get("decision"), reason: form.get("reason") }),
    {},
  );
  return (
    <form action={action}>
      <fieldset disabled={pending}>
        <label className="form-field">
          Decision
          <select name="decision">
            <option value="dismiss">Dismiss report</option>
            {kind === "project" ? (
              <>
                <option value="hide">Hide project</option>
                <option value="restore">Restore project</option>
              </>
            ) : (
              <>
                <option value="suspend">Suspend maker</option>
                <option value="reinstate">Reinstate maker</option>
              </>
            )}
          </select>
        </label>
        <label className="form-field">
          Decision reason
          <textarea name="reason" rows={3} minLength={10} maxLength={2000} required />
        </label>
        <p className="form-note">
          Visibility changes take effect immediately and are recorded. Verify the content before
          submitting.
        </p>
        <button className="button button-outline">{pending ? "Saving…" : "Save decision"}</button>
      </fieldset>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  );
}
