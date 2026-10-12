import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) throw new Error("Supabase environment is incomplete.");
const headers = { apikey: key, "Content-Type": "application/json" };
const checks = [
  ["Auth configuration", "/auth/v1/settings", "GET", undefined],
  ["Category catalog", "/rest/v1/categories?select=slug&limit=1", "GET", undefined],
  ["Project feed function", "/rest/v1/rpc/list_projects", "POST", { p_limit: 1 }],
  [
    "Public profile function",
    "/rest/v1/rpc/get_public_profile",
    "POST",
    { p_username: "ark_setup_check" },
  ],
];
for (const [name, route, method, body] of checks) {
  try {
    const response = await fetch(base + route, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    console.log(
      JSON.stringify({
        check: name,
        status: response.status,
        ...(response.ok
          ? {
              ready: true,
              ...(name === "Auth configuration"
                ? { github: Boolean(data.external?.github), google: Boolean(data.external?.google) }
                : {}),
            }
          : { ready: false, code: data.code ?? "unavailable" }),
      }),
    );
  } catch {
    console.log(JSON.stringify({ check: name, ready: false, code: "network_unavailable" }));
  }
}

// Read-only probes: verify that an anonymous publishable-key caller cannot read
// voter identities, object paths, private tables, or authenticated account state.
for (const [name, route, method, extraHeaders, expected] of [
  ["Raw upvotes protected", "/rest/v1/upvotes?select=user_id&limit=1", "GET", {}, [401, 403]],
  [
    "Media paths protected",
    "/rest/v1/project_media?select=object_key&limit=1",
    "GET",
    {},
    [401, 403],
  ],
  [
    "Private schema not exposed",
    "/rest/v1/account_settings?select=user_id&limit=1",
    "GET",
    { "Accept-Profile": "private" },
    [406],
  ],
  [
    "Account status requires authentication",
    "/rest/v1/rpc/my_account_status",
    "POST",
    {},
    [401, 403],
  ],
]) {
  try {
    const response = await fetch(base + route, {
      method,
      headers: { ...headers, ...extraHeaders },
      ...(method === "POST" ? { body: "{}" } : {}),
      signal: AbortSignal.timeout(15000),
    });
    console.log(
      JSON.stringify({
        check: name,
        status: response.status,
        protected: expected.includes(response.status),
      }),
    );
  } catch {
    console.log(JSON.stringify({ check: name, protected: false, code: "network_unavailable" }));
  }
}
