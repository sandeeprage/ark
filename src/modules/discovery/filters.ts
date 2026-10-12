import { z } from "zod";
export type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const slug = /^[a-z0-9-]{1,60}$/;
const cursorSchema = z.object({
  id: z.uuid(),
  published: z.iso.datetime({ offset: true }),
  votes: z.number().int().nonnegative(),
  scope: z.string().max(500),
});
export type FeedCursor = z.infer<typeof cursorSchema>;
export type FeedFilters = {
  feed: "popular" | "latest" | "following";
  category: string;
  stack: string[];
  query: string;
  cursor: FeedCursor | null;
};

export function filterScope(filters: Omit<FeedFilters, "cursor">) {
  return JSON.stringify([filters.feed, filters.category, [...filters.stack].sort(), filters.query]);
}

export function parseFilters(params: SearchParams, allowFollowing = false): FeedFilters {
  const rawCategory = first(params.category) ?? "";
  const rawStack = Array.isArray(params.stack) ? params.stack : params.stack ? [params.stack] : [];
  const base = {
    feed:
      allowFollowing && first(params.tab) === "following"
        ? ("following" as const)
        : first(params.tab) === "latest"
          ? ("latest" as const)
          : ("popular" as const),
    category: slug.test(rawCategory) ? rawCategory : "",
    stack: [...new Set(rawStack.filter((item) => slug.test(item)))].sort().slice(0, 10),
    query: (first(params.q) ?? "").trim().slice(0, 100),
  };
  let cursor: FeedCursor | null = null;
  const rawCursor = first(params.cursor);
  if (rawCursor && rawCursor.length < 1600) {
    try {
      const parsed = cursorSchema.safeParse(
        JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf8")),
      );
      if (parsed.success && parsed.data.scope === filterScope(base)) cursor = parsed.data;
    } catch {
      /* Invalid cursors reset pagination. */
    }
  }
  return { ...base, cursor };
}

export function feedUrl(
  filters: FeedFilters,
  changes: Partial<FeedFilters> = {},
  pathname = "/explore",
) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.feed !== "popular") params.set("tab", next.feed);
  if (next.category) params.set("category", next.category);
  next.stack.forEach((item) => params.append("stack", item));
  if (next.query) params.set("q", next.query);
  if (next.cursor)
    params.set("cursor", Buffer.from(JSON.stringify(next.cursor)).toString("base64url"));
  return pathname + (params.size ? `?${params}` : "");
}
