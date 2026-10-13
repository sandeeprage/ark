"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCollection,
  updateCollection,
  deleteCollection,
} from "@/modules/collections/actions";
import type { Collection } from "@/modules/collections/queries";
function CollectionEditor({ collection }: { collection: Collection }) {
  const router = useRouter();
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState({
    title: collection.title,
    description: collection.description,
  });
  const [pending, start] = useTransition();
  return (
    <article className="collection-editor">
      <Link className="text-link" href={`/collections/${collection.id}`}>
        <h2>{collection.title}</h2>
      </Link>
      <p>{collection.project_count} public projects · Public collection</p>
      {collection.is_default ? (
        <p>Your default Saved collection. Remove projects through the Save picker.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            start(async () => {
              try {
                const result = await updateCollection(collection.id, title, description);
                if (!result.ok) setError(result.error);
                else {
                  setSaved({ title, description });
                  setMessage("Collection saved.");
                  router.refresh();
                }
              } catch {
                setError("Check your connection and try again.");
              }
            });
          }}
        >
          <fieldset disabled={pending}>
            <label>
              Title
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setMessage("");
                }}
                required
                maxLength={80}
              />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setMessage("");
                }}
                maxLength={500}
              />
            </label>
            <button
              className="button button-outline"
              disabled={pending || (title === saved.title && description === saved.description)}
            >
              {pending ? "Saving…" : "Save collection"}
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete “${collection.title}”? This removes the collection and its saved memberships. Projects stay on ARK.`,
                  )
                )
                  return;
                start(async () => {
                  try {
                    const result = await deleteCollection(collection.id);
                    if (!result.ok) setError(result.error);
                    else router.refresh();
                  } catch {
                    setError("Check your connection and try again.");
                  }
                });
              }}
            >
              Delete collection
            </button>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
    </article>
  );
}
export function CollectionManager({ collections }: { collections: Collection[] }) {
  const router = useRouter();
  const key = useRef("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <p className="notice">
        Every collection is public, including Saved. Anyone can view the projects you collect.
      </p>
      <form
        className="collection-editor"
        onSubmit={(e) => {
          e.preventDefault();
          key.current ||= crypto.randomUUID();
          setError("");
          start(async () => {
            try {
              const result = await createCollection(key.current, title, description);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setTitle("");
              setDescription("");
              key.current = "";
              router.refresh();
            } catch {
              setError("Check your connection and try again.");
            }
          });
        }}
      >
        <h2>Create a public collection</h2>
        <fieldset disabled={pending}>
          <label>
            Title
            <input
              required
              maxLength={80}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                key.current = "";
              }}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                key.current = "";
              }}
            />
          </label>
          <button className="button button-primary">
            {pending ? "Creating…" : "Create collection"}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
      {collections.map((c) => (
        <CollectionEditor key={c.id} collection={c} />
      ))}
      {!collections.length && <p>Save a project to create your default Saved collection.</p>}
    </>
  );
}
