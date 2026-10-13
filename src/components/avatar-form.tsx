"use client";
import { useActionState, useState } from "react";
import { saveAvatar } from "@/modules/profiles/avatar-actions";
import { Avatar } from "./avatar";
export function AvatarForm({
  id,
  name,
  hasAvatar,
  version,
  providers = [],
}: {
  id: string;
  name: string;
  hasAvatar?: boolean;
  version?: string | null;
  providers?: string[];
}) {
  const [selected, setSelected] = useState("");
  const [state, action, pending] = useActionState<
    { error?: string; success?: string; version?: string; fileStamp?: string },
    FormData
  >(async (previous, data) => {
    const result = await saveAvatar(previous, data);
    if (result.success) setSelected("");
    return result;
  }, {});
  const present =
    state.success === "Avatar removed."
      ? false
      : state.success === "Avatar saved."
        ? true
        : hasAvatar;
  return (
    <form action={action} className="avatar-form">
      <Avatar
        key={state.version || version}
        id={id}
        name={name}
        hasAvatar={present}
        version={state.version || version}
        className="avatar-profile"
      />
      <label className="form-field">
        Profile photo
        <input
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-describedby="avatar-help avatar-error"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setSelected(file ? `${file.name}|${file.size}|${file.lastModified}` : "");
          }}
          disabled={pending}
        />
      </label>
      <p id="avatar-help" className="form-note">
        PNG, JPEG, or WebP up to 2 MiB. Cropped to a square. Only upload an image you have
        permission to publish.
      </p>
      <div className="dialog-actions">
        <button
          className="button button-outline"
          disabled={pending || !selected || selected === state.fileStamp}
        >
          {pending ? "Saving…" : "Save avatar"}
        </button>
        {present && (
          <button name="remove" value="true" className="button button-outline" disabled={pending}>
            Remove avatar
          </button>
        )}
        {providers.map((provider) => (
          <button
            key={provider}
            name="import_provider"
            value={provider}
            className="button button-outline"
            disabled={pending}
          >
            Use my {provider === "github" ? "GitHub" : "Google"} photo
          </button>
        ))}
      </div>
      <p className="form-note">
        Importing copies your provider photo into ARK and makes it public.
      </p>
      {state.error && (
        <p id="avatar-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  );
}
