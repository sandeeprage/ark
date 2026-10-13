"use client";
import { useActionState, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  connectIdentity,
  disconnectIdentity,
  requestAccountDeletion,
} from "@/modules/auth/account-actions";
import { signIn } from "@/modules/auth/actions";

function VerifyAccount({ providers }: { providers: string[] }) {
  return (
    <form action={signIn}>
      <input type="hidden" name="next" value="/settings" />
      <p className="form-note">Sensitive changes require a sign-in from the last 10 minutes.</p>
      {providers.map((provider) => (
        <button key={provider} className="button button-outline" name="provider" value={provider}>
          Verify with {provider === "github" ? "GitHub" : "Google"}
        </button>
      ))}
    </form>
  );
}
export function AccountConnections({
  providers,
  recent,
}: {
  providers: string[];
  recent: boolean;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div>
      <p className="form-note">
        These identities can sign in to this ARK account. Connecting an identity does not merge
        another ARK account’s projects.
      </p>
      {["github", "google"].map((provider) => (
        <div className="identity-row" key={provider}>
          <div>
            <strong>{provider === "github" ? "GitHub" : "Google"}</strong>
            <p>{providers.includes(provider) ? "Connected" : "Not connected"}</p>
          </div>
          {providers.includes(provider) ? (
            <button
              className="button button-outline"
              disabled={pending || providers.length < 2 || !recent}
              onClick={() => setConfirm(provider)}
            >
              Disconnect {provider === "github" ? "GitHub" : "Google"}
            </button>
          ) : (
            <ConnectIdentity provider={provider} recent={recent} />
          )}
        </div>
      ))}
      <p className="form-note">
        Keep at least one sign-in identity connected. Disconnecting GitHub also removes its public
        connection and invalidates repository ownership verification. To revoke ARK’s provider
        authorization, also remove ARK in your Google or GitHub account permissions.
      </p>
      {!recent && <VerifyAccount providers={providers} />}
      <Dialog.Root
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!pending && !open) setConfirm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content className="delete-dialog">
            <Dialog.Title>Disconnect {confirm}?</Dialog.Title>
            <Dialog.Description>
              You will no longer be able to sign in through this identity. Your other connected
              identity and ARK projects stay available.
            </Dialog.Description>
            {error && <p role="alert">{error}</p>}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="button button-outline" disabled={pending}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="button button-primary"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  start(async () => {
                    try {
                      const result = await disconnectIdentity(confirm!);
                      if (result.error) setError(result.error);
                      else {
                        setSuccess(result.success!);
                        setConfirm(null);
                      }
                    } catch {
                      setError("Check your connection and try again.");
                    }
                  });
                }}
              >
                {pending ? "Disconnecting…" : "Disconnect account"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {success && <p role="status">{success}</p>}
    </div>
  );
}
function ConnectIdentity({ provider, recent }: { provider: string; recent: boolean }) {
  const [state, action, pending] = useActionState(async () => connectIdentity(provider), {
    error: "",
  });
  return (
    <form action={action}>
      <button className="button button-outline" disabled={pending || !recent}>
        {pending ? "Opening provider…" : `Connect ${provider === "github" ? "GitHub" : "Google"}`}
      </button>
      {state?.error && (
        <p role="alert" className="field-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
export function OptionalGitHubConnection({ next }: { next: string }) {
  const [state, action, pending] = useActionState(async () => connectIdentity("github", next), {
    error: "",
  });
  return (
    <section className="settings-section">
      <h2>GitHub is optional</h2>
      <p className="form-note">
        Connect GitHub if you want an authenticated GitHub link or repository verification. You can
        skip this and create your profile below.
      </p>
      <form action={action}>
        <button className="button button-outline" disabled={pending}>
          {pending ? "Opening GitHub…" : "Connect GitHub (optional)"}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
      </form>
    </section>
  );
}
export function AccountDangerZone({
  username,
  providers,
  recent,
}: {
  username: string;
  providers: string[];
  recent: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [state, action, pending] = useActionState(
    async () => requestAccountDeletion(confirmation),
    { error: "" },
  );
  return (
    <section className="settings-section">
      <h2>Delete account</h2>
      <p className="form-note">
        Your public portfolio is hidden immediately. Your account, projects, media, votes, follows,
        collections, and notifications are queued for permanent removal. This cannot be undone.
      </p>
      {!recent && <VerifyAccount providers={providers} />}
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <Dialog.Trigger asChild>
          <button className="button button-outline" disabled={!recent}>
            Delete my account
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content className="delete-dialog">
            <Dialog.Title>Delete your ARK account?</Dialog.Title>
            <Dialog.Description>
              All your ARK content and social activity will be removed. Type{" "}
              {username === "DELETE" ? "DELETE" : "your username"}, {username}, to confirm. Keep
              copies of any work you need before continuing.
            </Dialog.Description>
            <form action={action}>
              <label className="form-field">
                {username === "DELETE" ? "Confirmation" : "ARK username"}
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                  required
                />
              </label>
              {state?.error && <p role="alert">{state.error}</p>}
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <button type="button" className="button button-outline" disabled={pending}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  className="button button-primary"
                  disabled={pending || confirmation !== username}
                >
                  {pending ? "Requesting deletion…" : "Permanently delete account"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
