"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Pin, Trash2, X } from "lucide-react";
import { deleteProject, setProfilePin } from "@/modules/projects/actions";

export function ProjectManagement({
  id,
  name,
  pinned,
}: {
  id: string;
  name: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pin() {
    setBusy(true);
    setError("");
    try {
      const result = await setProfilePin(id, !pinned);
      if (!result.ok) setError(result.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await deleteProject(id, confirmation);
      if (!result.ok) setError(result.error);
      else {
        setOpen(false);
        router.push("/explore");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="owner-controls">
      <Link href={`/projects/${id}/edit`} className="button button-outline">
        <Pencil size={15} />
        Edit
      </Link>
      <button className="button button-outline" aria-pressed={pinned} disabled={busy} onClick={pin}>
        <Pin size={15} />
        {pinned ? "Unpin" : "Pin on profile"}
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="button button-outline">
            <Trash2 size={15} />
            Delete
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-overlay" />
          <Dialog.Content className="delete-dialog">
            <Dialog.Title>Delete {name}?</Dialog.Title>
            <Dialog.Description>
              The project will immediately disappear from public pages. Its screenshots will be
              removed by the cleanup job. Type the project name to confirm.
            </Dialog.Description>
            <label className="form-field">
              Project name
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="button button-outline" disabled={busy}>
                  Cancel
                </button>
              </Dialog.Close>
              <button
                className="button button-primary"
                disabled={busy || confirmation !== name}
                onClick={remove}
              >
                {busy ? "Deleting…" : "Delete project"}
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button drawer-close" aria-label="Close delete dialog">
                <X size={18} />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {error && !open && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
