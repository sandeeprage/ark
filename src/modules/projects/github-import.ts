import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const IMPORT_COOKIE = "ark-github-import";
export const IMPORT_FLOW_COOKIE = "ark-github-import-flow";

export type ImportSession = { actor: string; githubId: number; token: string; expiresAt: number };
export type ImportRepository = {
  id: number;
  name: string;
  fullName: string;
  description: string;
  url: string;
  homepage: string;
};

export function importConfig() {
  const clientId = process.env.GITHUB_IMPORT_CLIENT_ID;
  const clientSecret = process.env.GITHUB_IMPORT_CLIENT_SECRET;
  const slug = process.env.GITHUB_IMPORT_APP_SLUG;
  const key = process.env.GITHUB_IMPORT_COOKIE_KEY;
  if (!clientId || !clientSecret || !slug || !/^[a-z0-9-]+$/.test(slug) || !key) return null;
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32 || bytes.toString("base64") !== key) return null;
  return { clientId, clientSecret, slug, key: bytes };
}

export function seal(value: object, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function unseal<T>(value: string | undefined, key: Buffer): T | null {
  if (!value || value.length > 6000) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    if (bytes.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(),
    ) as T;
  } catch {
    return null;
  }
}

export async function activeGitHubActor() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !user.identities?.some((identity) => identity.provider === "github"))
    return null;
  const { data: status, error: statusError } = await client.rpc("my_account_status");
  if (statusError || status !== "active") return null;
  const { data: profile, error: profileError } = await createAdminClient()
    .from("profiles")
    .select("github_user_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.github_user_id) return null;
  const githubId = Number(profile.github_user_id);
  return Number.isSafeInteger(githubId) && githubId > 0 ? { actor: user.id, githubId } : null;
}

export async function githubGet(path: string, token: string) {
  if (!/^\/(user|user\/installations(?:\/\d+\/repositories)?)(?:\?[^#]*)?$/.test(path))
    throw new Error("Invalid GitHub API path.");
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ARK-Repository-Import",
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "GitHub access expired. Connect again."
        : "GitHub repositories are unavailable. Try again.",
    );
  return response.json();
}

export async function authorizedImportSession(cookie: string | undefined) {
  const config = importConfig();
  const actor = config ? await activeGitHubActor() : null;
  const session = config ? unseal<ImportSession>(cookie, config.key) : null;
  if (
    !actor ||
    !session ||
    session.actor !== actor.actor ||
    session.githubId !== actor.githubId ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= Date.now() ||
    typeof session.token !== "string" ||
    !session.token.startsWith("ghu_")
  )
    return null;
  return session;
}

export async function listImportRepositories(
  token: string,
  githubId: number,
): Promise<{ repositories: ImportRepository[]; installations: number; githubUsername: string }> {
  const githubUser = await githubGet("/user", token);
  if (githubUser.id !== githubId || typeof githubUser.login !== "string")
    throw new Error("GitHub account changed. Connect repository access again.");
  const repositories: ImportRepository[] = [];
  const seen = new Set<number>();
  let installations = 0;
  for (let page = 1; page <= 5; page++) {
    const result = await githubGet(`/user/installations?per_page=100&page=${page}`, token);
    if (!Array.isArray(result.installations))
      throw new Error("GitHub returned an invalid installation list.");
    for (const installation of result.installations) {
      if (
        !Number.isSafeInteger(installation.id) || installation.id <= 0 ||
        installation.account?.id !== githubId || installation.suspended_at
      ) continue;
      installations++;
      for (let repoPage = 1; repoPage <= 5; repoPage++) {
        const listed = await githubGet(
          `/user/installations/${installation.id}/repositories?per_page=100&page=${repoPage}`,
          token,
        );
        if (!Array.isArray(listed.repositories))
          throw new Error("GitHub returned an invalid repository list.");
        for (const repo of listed.repositories) {
          if (
            repo.private !== false ||
            repo.owner?.id !== githubId ||
            repo.archived ||
            repo.disabled ||
            !Number.isSafeInteger(repo.id) ||
            seen.has(repo.id) ||
            typeof repo.name !== "string" ||
            typeof repo.full_name !== "string" ||
            typeof repo.html_url !== "string"
          )
            continue;
          if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.html_url))
            continue;
          seen.add(repo.id);
          repositories.push({
            id: repo.id,
            name: repo.name.slice(0, 80),
            fullName: repo.full_name,
            description:
              typeof repo.description === "string" ? repo.description.slice(0, 10000) : "",
            url: repo.html_url,
            homepage: typeof repo.homepage === "string" ? repo.homepage.slice(0, 2000) : "",
          });
        }
        if (listed.repositories.length < 100 || repositories.length >= 500) break;
      }
      if (repositories.length >= 500) break;
    }
    if (result.installations.length < 100 || repositories.length >= 500) break;
  }
  return {
    repositories: repositories.sort((a, b) => a.fullName.localeCompare(b.fullName)),
    installations,
    githubUsername: githubUser.login,
  };
}
