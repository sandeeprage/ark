"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Bookmark, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  collectionPicker,
  createCollection,
  saveToCollection,
  type PickerItem,
} from "@/modules/collections/actions";
export function SaveButton({
  id,
  saved = false,
  access = "anonymous",
  compact = false,
}: {
  id: string;
  saved?: boolean;
  access?: string;
  compact?: boolean;
}) {
  const [isSaved, setSaved] = useState(saved);
  const [lastSavedProp, setLastSavedProp] = useState(saved);
  if (saved !== lastSavedProp) {
    setLastSavedProp(saved);
    setSaved(saved);
  }
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [defaultSelected, setDefaultSelected] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const key = useRef("");
  useEffect(() => {
    function changed(event: Event) {
      const detail = (event as CustomEvent<{ id: string; saved: boolean }>).detail;
      if (detail?.id === id) setSaved(detail.saved);
    }
    window.addEventListener("ark:saved-changed", changed);
    return () => window.removeEventListener("ark:saved-changed", changed);
  }, [id]);
  const className = compact ? "icon-button save-button" : "button button-outline";
  if (access === "anonymous")
    return (
      <Link
        className={className}
        href={`/login?next=${encodeURIComponent(`/projects/${id}`)}`}
        aria-label="Sign in to save project"
      >
        <Bookmark size={16} />
        {!compact && "Save"}
      </Link>
    );
  function load() {
    setError("");
    start(async () => {
      try {
        const result = await collectionPicker(id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setItems(result.items);
        setLoaded(true);
        setSaved(result.items.some((i) => i.contains_project));
      } catch {
        setError("Check your connection and try again.");
      }
    });
  }
  function change(collection: string | null, desired: boolean) {
    setError("");
    const before = items;
    if (collection === null) setDefaultSelected(desired);
    else
      setItems((previous) =>
        previous.map((item) =>
          item.id === collection ? { ...item, contains_project: desired } : item,
        ),
      );
    start(async () => {
      try {
        const result = await saveToCollection(id, collection, desired);
        if (!result.ok) {
          setItems(before);
          setDefaultSelected(false);
          setError(result.error);
          return;
        }
        setSaved(result.data.saved);
        window.dispatchEvent(
          new CustomEvent("ark:saved-changed", { detail: { id, saved: result.data.saved } }),
        );
        const actual = result.data.collection_id;
        if (actual)
          setItems((previous) =>
            previous.some((i) => i.id === actual)
              ? previous.map((i) => (i.id === actual ? { ...i, contains_project: desired } : i))
              : [
                  { id: actual, title: "Saved", is_default: true, contains_project: desired },
                  ...previous,
                ],
          );
      } catch {
        setItems(before);
        setDefaultSelected(false);
        setError("Check your connection and try again.");
      }
    });
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setLoaded(false);
          load();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={className}
          disabled={access === "restricted"}
          aria-label={isSaved ? "Manage saved project" : "Save project"}
          aria-pressed={isSaved}
        >
          <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
          {!compact && (isSaved ? "Saved" : "Save")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="social-dialog">
          <Dialog.Title>Save to a collection</Dialog.Title>
          <Dialog.Description>
            Public collection — anyone can view this. Your saved projects are public.
          </Dialog.Description>
          <Dialog.Close asChild>
            <button className="icon-button drawer-close" aria-label="Close collections">
              <X size={20} />
            </button>
          </Dialog.Close>
          {loaded && (
            <fieldset disabled={pending} className="collection-picker">
              <legend className="sr-only">Public collections</legend>
              {!items.some((i) => i.is_default) && (
                <label>
                  <input
                    type="checkbox"
                    checked={defaultSelected}
                    onChange={(e) => change(null, e.target.checked)}
                  />
                  Saved <small>Created on your first save</small>
                </label>
              )}
              {items.map((i) => (
                <label key={i.id}>
                  <input
                    type="checkbox"
                    checked={i.contains_project}
                    onChange={(e) => change(i.id, e.target.checked)}
                  />
                  {i.title}
                </label>
              ))}
            </fieldset>
          )}
          {!loaded && !error && <p role="status">Loading collections…</p>}
          {error && (
            <p role="alert" className="notice notice-error">
              {error}{" "}
              {!loaded && (
                <button className="button button-outline" onClick={load} disabled={pending}>
                  Retry
                </button>
              )}
            </p>
          )}
          <form
            className="inline-collection"
            onSubmit={(e) => {
              e.preventDefault();
              key.current ||= crypto.randomUUID();
              setError("");
              start(async () => {
                try {
                  const result = await createCollection(key.current, title, "");
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setItems((previous) =>
                    previous.some((i) => i.id === result.id)
                      ? previous
                      : [
                          ...previous,
                          {
                            id: result.id,
                            title: title.trim(),
                            is_default: false,
                            contains_project: false,
                          },
                        ],
                  );
                  setTitle("");
                  key.current = "";
                } catch {
                  setError("Check your connection and try again.");
                }
              });
            }}
          >
            <label>
              New public collection
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  key.current = "";
                }}
                required
                maxLength={80}
                disabled={pending}
              />
            </label>
            <button className="button button-outline" disabled={pending || !loaded}>
              Create collection
            </button>
          </form>
          <p role="status">{pending ? "Saving…" : "Changes save immediately."}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
