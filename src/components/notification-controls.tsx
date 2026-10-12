"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markNotificationsRead,
  saveNotificationPreferences,
} from "@/modules/notifications/actions";
import type { Preferences } from "@/modules/notifications/queries";
export function MarkRead({ id, cutoff }: { id?: string; cutoff?: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <button
        className="button button-outline"
        disabled={pending}
        onClick={() => {
          setError("");
          start(async () => {
            try {
              const result = await markNotificationsRead(id ? [id] : null, cutoff ?? null);
              if (!result.ok) setError(result.error);
              else {
                window.dispatchEvent(new Event("ark:notifications-changed"));
                router.refresh();
              }
            } catch {
              setError("Check your connection and try again.");
            }
          });
        }}
      >
        {pending ? "Saving…" : id ? "Mark read" : "Mark all read"}
      </button>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
    </>
  );
}
export function NotificationPreferences({ initial }: { initial: Preferences }) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        start(async () => {
          try {
            const result = await saveNotificationPreferences(values);
            if (!result.ok) setError(result.error);
            else setMessage("Preferences saved.");
          } catch {
            setError("Check your connection and try again.");
          }
        });
      }}
    >
      <fieldset disabled={pending} className="collection-picker">
        <legend>Notify me when</legend>
        {(
          [
            ["follows", "Someone follows me"],
            ["upvotes", "Someone upvotes my project"],
            ["launches", "A maker I follow launches a project"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="form-note">Preferences apply to new notifications.</p>
      <button className="button button-outline" disabled={pending}>
        {pending ? "Saving…" : "Save preferences"}
      </button>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </form>
  );
}
