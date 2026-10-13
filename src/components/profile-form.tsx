"use client";
import { useActionState, useEffect, useRef, useState } from "react";
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
  const [values, setValues] = useState({
    display_name: profile?.display_name ?? "",
    username: profile?.username ?? "",
    bio: profile?.bio ?? "",
  });
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, data) => {
    const result = await saveProfile(previous, data);
    if (result.saved && result.success) setValues(result.saved);
    return result;
  }, {});
  const [edited, setEdited] = useState<string[]>([]);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const original = state.saved ?? profile;
  const dirty = Object.entries(values).some(
    ([key, value]) => value !== (original?.[key as keyof typeof values] ?? ""),
  );
  const errorFor = (key: string) => (edited.includes(key) ? undefined : state.fields?.[key]?.[0]);
  useEffect(() => {
    if (state.error) errorSummary.current?.focus();
  }, [state]);
  function change(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setEdited((current) => [...new Set([...current, key])]);
  }
  return (
    <form
      action={(data) => {
        setEdited([]);
        action(data);
      }}
      className="profile-form"
    >
      <input type="hidden" name="onboarding" value={String(onboarding)} />
      <input type="hidden" name="next" value={next} />
      <label className="form-field">
        Display name
        <input
          name="display_name"
          disabled={pending}
          autoComplete="name"
          value={values.display_name}
          onChange={(e) => change("display_name", e.target.value)}
          required
          maxLength={80}
          aria-invalid={Boolean(errorFor("display_name"))}
          aria-label="Display name"
          aria-describedby="display-name-error"
        />
        <small id="display-name-error" className="field-error">
          {errorFor("display_name")}
        </small>
      </label>
      <label className="form-field">
        ARK username
        <div className="username-input">
          <span>@</span>
          <input
            name="username"
            disabled={pending}
            autoComplete="username"
            value={values.username}
            onChange={(e) => change("username", e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9_]+"
            aria-invalid={Boolean(errorFor("username"))}
            aria-label="ARK username"
            aria-describedby="username-help username-error"
          />
        </div>
        <small id="username-help">
          3–30 lowercase letters, numbers, or underscores. This is your public profile URL.
        </small>
        <small id="username-error" className="field-error">
          {errorFor("username")}
        </small>
      </label>
      <label className="form-field">
        Bio <span className="optional">optional</span>
        <textarea
          name="bio"
          disabled={pending}
          rows={4}
          maxLength={500}
          value={values.bio}
          onChange={(e) => change("bio", e.target.value)}
          placeholder="What do you build?"
          aria-invalid={Boolean(errorFor("bio"))}
          aria-describedby="bio-error"
          aria-label="Bio"
        />
        <small id="bio-error" className="field-error">
          {errorFor("bio")}
        </small>
      </label>
      {!onboarding && (
        <p className="form-note">
          Changing your username changes your profile URL. Old links may stop working.
        </p>
      )}
      <div aria-live="polite">
        {state.error && edited.length === 0 && (
          <p
            ref={errorSummary}
            tabIndex={-1}
            role="alert"
            className="notice notice-error form-error-summary"
          >
            {state.error}
          </p>
        )}
        {state.success && !dirty && (
          <p className="notice">
            <Check size={16} />
            {state.success}
          </p>
        )}
      </div>
      <button className="button button-primary" disabled={pending || (!onboarding && !dirty)}>
        {pending ? "Saving…" : onboarding ? "Create my profile" : "Save profile"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
