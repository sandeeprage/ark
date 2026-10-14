"use client";
import { useEffect, useState } from "react";
import { Github } from "lucide-react";
import { connectIdentity } from "@/modules/auth/account-actions";
import type { ImportRepository } from "@/modules/projects/github-import";

export function GitHubRepositoryImport({
  connected,
  available,
  appSlug,
  githubUsername,
  onImport,
}: {
  connected: boolean;
  available: boolean;
  appSlug: string;
  githubUsername: string;
  onImport: (repository: ImportRepository, useDescription: boolean) => void;
}) {
  const [repos, setRepos] = useState<ImportRepository[]>([]);
  const [state, setState] = useState<"loading" | "authorize" | "install" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [useDescription, setUseDescription] = useState(true);
  const [connecting, setConnecting] = useState(false);
  useEffect(() => {
    if (!available || !connected) return;
    const controller = new AbortController();
    fetch("/api/github/import/repositories", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setState("authorize");
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.error ?? "GitHub repositories could not be loaded.");
          setState("error");
          return;
        }
        setRepos(Array.isArray(data.repositories) ? data.repositories : []);
        setState(data.installations ? "ready" : "install");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setMessage("GitHub repositories could not be loaded.");
          setState("error");
        }
      });
    return () => controller.abort();
  }, [available, connected]);
  if (!available) return null;
  const filtered = repos
    .filter((repo) => repo.fullName.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 100);
  return (
    <div className="github-import">
      <div className="github-import-heading">
        <Github size={20} aria-hidden="true" />
        <div>
          <h3>Import from GitHub</h3>
          <p>Choose one of your own repositories, then review everything before publishing.</p>
        </div>
      </div>
      {connected && githubUsername && <p>Connected GitHub account: <strong>@{githubUsername}</strong></p>}
      {!connected ? (
        <>
          <p>Connect your GitHub identity to your ARK account first.</p>
          <button
            type="button"
            className="button button-outline"
            disabled={connecting}
            onClick={async () => {
              setConnecting(true);
              try {
                const result = await connectIdentity("github", "/publish");
                if (result?.error) setMessage(result.error);
              } catch {
                setMessage("GitHub connection could not be started.");
              } finally {
                setConnecting(false);
              }
            }}
          >
            {connecting ? "Connecting…" : "Connect GitHub"}
          </button>
        </>
      ) : state === "loading" ? (
        <p role="status">Checking repository access…</p>
      ) : state === "authorize" ? (
        <>
          <p>Authorize ARK to read the repositories you select for import.</p>
          <a className="button button-outline" href="/api/github/import/start">
            Connect repository access
          </a>
        </>
      ) : state === "install" ? (
        <>
          <p>
            Choose which repositories ARK can access in GitHub. Only public, active repositories can
            be imported into a public ARK listing.
          </p>
          <a
            className="button button-outline"
            href={`https://github.com/apps/${appSlug}/installations/new`}
          >
            Choose repositories on GitHub
          </a>
        </>
      ) : state === "error" ? (
        <>
          <p role="alert">{message}</p>
          <a className="button button-outline" href="/api/github/import/start">
            Reconnect GitHub access
          </a>
        </>
      ) : (
        <>
          {repos.length ? (
            <>
              <label className="form-field">
                Search your permitted public repositories
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Repository name"
                />
              </label>
              <label className="form-field">
                Description choice
                <select
                  value={useDescription ? "github" : "own"}
                  onChange={(event) => setUseDescription(event.target.value === "github")}
                >
                  <option value="github">Use GitHub description</option>
                  <option value="own">Write my own description</option>
                </select>
              </label>
              <ul className="github-import-list">
                {filtered.map((repo) => (
                  <li key={repo.id}>
                    <div>
                      <strong>{repo.fullName}</strong>
                      <span>{repo.description || "No GitHub description"}</span>
                    </div>
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => onImport(repo, useDescription)}
                    >
                      Import
                    </button>
                  </li>
                ))}
              </ul>
              {!filtered.length && <p>No matching repositories.</p>}
            </>
          ) : (
            <p>
              No permitted public repositories owned by your connected GitHub account found. Add a public repository in GitHub’s app
              settings, or enter your project manually.
            </p>
          )}
          <a href={`https://github.com/settings/installations`} target="_blank" rel="noreferrer">
            Manage repository permissions on GitHub ↗
          </a>
        </>
      )}
      {connected && state !== "error" && message && <p role="alert">{message}</p>}
      <p className="form-note">
        Import fills project details only. Your repository and source code are not copied into ARK.
      </p>
    </div>
  );
}
