import { normalizeUrl } from "./validation";

export type RepositoryCheck =
  | { state: "verified"; repositoryId: number; ownerId: number; url: string }
  | { state: "unverified" }
  | { state: "provider_unavailable" };

export async function checkPublicRepository(
  url: string,
  githubUserId: string,
  request: typeof fetch = fetch,
): Promise<RepositoryCheck> {
  try {
    const normalized = normalizeUrl(url, true);
    const parts = new URL(normalized).pathname.split("/").slice(1);
    // Fixed host, no credentials, no arbitrary redirects, no provider tokens.
    const response = await request(`https://api.github.com/repos/${parts.join("/")}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ARK-Repository-Verification",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404 || response.status === 301) return { state: "unverified" };
    if (!response.ok) return { state: "provider_unavailable" };
    const data = await response.json();
    if (
      data.private !== false ||
      data.visibility !== "public" ||
      data.owner?.type !== "User" ||
      !Number.isSafeInteger(data.owner.id) ||
      data.owner.id <= 0 ||
      String(data.owner.id) !== githubUserId ||
      !Number.isSafeInteger(data.id) ||
      data.id <= 0 ||
      typeof data.html_url !== "string" ||
      normalizeUrl(data.html_url, true) !== normalized
    )
      return { state: "unverified" };
    return { state: "verified", repositoryId: data.id, ownerId: data.owner.id, url: normalized };
  } catch {
    return { state: "provider_unavailable" };
  }
}
