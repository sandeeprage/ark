import { createServerClient } from "@supabase/ssr";
import { expect, it } from "vitest";

it("re-saving app tokens removes OAuth provider tokens from SSR cookies", async () => {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: "123e4567-e89b-42d3-a456-426614174000",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "github" },
    user_metadata: {},
    created_at: "2026-10-12T00:00:00Z",
  };
  const jwt = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, exp: expires }, "signature"]
    .map((part) =>
      Buffer.from(typeof part === "string" ? part : JSON.stringify(part)).toString("base64url"),
    )
    .join(".");
  const unsafeSession = {
    access_token: jwt,
    refresh_token: "ark-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expires,
    user,
    provider_token: "github-secret-".repeat(600),
    provider_refresh_token: "google-secret",
  };
  const encoded = "base64-" + Buffer.from(JSON.stringify(unsafeSession)).toString("base64url");
  const jar = new Map<string, string>();
  for (let offset = 0, index = 0; offset < encoded.length; offset += 3000, index++)
    jar.set(`sb-project-auth-token.${index}`, encoded.slice(offset, offset + 3000));
  const client = createServerClient("https://project.supabase.co", "publishable-test-key", {
    global: {
      fetch: async () =>
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (updates) => {
        for (const { name, value } of updates) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const result = await client.auth.setSession({ access_token: jwt, refresh_token: "ark-refresh" });
  expect(result.error).toBeNull();
  const sessionCookie =
    jar.get("sb-project-auth-token") ??
    [...jar]
      .filter(([name]) => /^sb-project-auth-token\.\d+$/.test(name))
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, value]) => value)
      .join("");
  const saved = JSON.parse(
    Buffer.from(sessionCookie.replace(/^base64-/, ""), "base64url").toString("utf8"),
  );
  expect(saved.access_token).toBe(jwt);
  expect(saved.refresh_token).toBe("ark-refresh");
  expect(saved).not.toHaveProperty("provider_token");
  expect(saved).not.toHaveProperty("provider_refresh_token");
  expect([...jar.values()].join("")).not.toContain("github-secret");
});
