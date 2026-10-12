"use client";
import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { saveProfile, type FormState } from "@/modules/auth/actions";
import type { Profile } from "@/modules/auth/session";

export function ProfileForm({
  profile,
  onboarding = false,
  next = "/explore",
}: {
  profile: Profile | null;
  onboarding?: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <form action={action} className="profile-form">
      <input type="hidden" name="onboarding" value={String(onboarding)} />
      <input type="hidden" name="next" value={next} />
      <label className="form-field">
        Display name
        <input
          name="display_name"
          autoComplete="name"
          defaultValue={profile?.display_name ?? ""}
          required
          maxLength={80}
          aria-invalid={Boolean(state.fields?.display_name)}
          aria-describedby="display-name-error"
        />
        <small id="display-name-error" className="field-error">
          {state.fields?.display_name?.[0]}
        </small>
      </label>
      <label className="form-field">
        ARK username
        <div className="username-input">
          <span>@</span>
          <input
            name="username"
            autoComplete="username"
            defaultValue={profile?.username ?? ""}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]+"
            aria-invalid={Boolean(state.fields?.username)}
            aria-describedby="username-help username-error"
          />
        </div>
        <small id="username-help">
          3–30 lowercase letters, numbers, or underscores. This is your public profile URL.
        </small>
        <small id="username-error" className="field-error">
          {state.fields?.username?.[0]}
        </small>
      </label>
      <label className="form-field">
        Bio <span className="optional">optional</span>
        <textarea
          name="bio"
          rows={4}
          maxLength={500}
          defaultValue={profile?.bio ?? ""}
          placeholder="What do you build?"
          aria-invalid={Boolean(state.fields?.bio)}
        />
        <small className="field-error">{state.fields?.bio?.[0]}</small>
      </label>
      {!onboarding && (
        <p className="form-note">
          Changing your username changes your profile URL. Old links may stop working.
        </p>
      )}
      <div aria-live="polite">
        {state.error && <p className="notice notice-error">{state.error}</p>}
        {state.success && (
          <p className="notice">
            <Check size={16} />
            {state.success}
          </p>
        )}
      </div>
      <button className="button button-primary" disabled={pending}>
        {pending ? "Saving…" : onboarding ? "Create my profile" : "Save profile"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
