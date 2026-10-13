// Disposable protocol fixture. Used only on localhost:55431 by the isolated
// publishing browser tests. It never connects to or inserts content into Supabase.
import http from "node:http";
import { randomUUID, createHash } from "node:crypto";
const owner = "00000000-0000-4000-a000-000000000001",
  projectId = "10000000-0000-4000-a000-000000000001",
  categoryId = "20000000-0000-4000-a000-000000000001",
  technologyId = "30000000-0000-4000-a000-000000000001";
const user = {
  id: owner,
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.test",
  app_metadata: { provider: "github" },
  user_metadata: {},
  created_at: "2026-10-12T00:00:00Z",
};
let project = null;
let assets = new Map();
let files = new Map();
let media = [];
let pinned = false;
let discovery = null;
let votes = new Set();
let failVote = false;
let followed = false;
let failFollow = false;
let authCodes = new Map();
let authMode = "active";
let collections = [];
let memberships = new Map();
let notices = [];
let preferences = { follows: true, upvotes: true, launches: true };
let failSave = false;
let googleEnabled = false;
let profileOverride = null;
let repositoryVerification = null;
function authSession() {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [
    { alg: "HS256", typ: "JWT" },
    { sub: owner, exp: expires, role: "authenticated" },
    "fixture-signature",
  ]
    .map((p) => Buffer.from(typeof p === "string" ? p : JSON.stringify(p)).toString("base64url"))
    .join(".");
  return {
    access_token: jwt,
    refresh_token: "fixture-refresh",
    expires_in: 3600,
    token_type: "bearer",
    user,
    provider_token: "fixture-provider-token",
    provider_refresh_token: "fixture-provider-refresh",
  };
}
function summary() {
  return project?.status === "published"
    ? {
        ...project,
        maker_id: owner,
        maker_username: "fixture_maker",
        maker_name: "Fixture maker",
        category: "Developer tools",
        category_slug: "developer-tools",
        stack: ["TypeScript"],
        upvote_count: 0,
      }
    : null;
}
const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3001");
  response.setHeader("Access-Control-Allow-Headers", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  const url = new URL(request.url, "http://127.0.0.1:55431");
  const path = url.pathname;
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  const json = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(data));
  };
  const body = () => (bytes.length ? JSON.parse(bytes.toString()) : {});
  try {
    if (path === "/__health") return json({ ready: true });
    if (path === "/__reset") {
      repositoryVerification = null;
      googleEnabled = false;
      profileOverride = null;
      user.app_metadata.provider = "github";
      collections = [];
      memberships = new Map();
      notices = [];
      preferences = { follows: true, upvotes: true, launches: true };
      failSave = false;
      followed = false;
      failFollow = false;
      project = null;
      assets = new Map();
      files = new Map();
      media = [];
      pinned = false;
      discovery = null;
      votes = new Set();
      failVote = false;
      authCodes = new Map();
      authMode = "active";
      return json({ ready: true });
    }
    if (path === "/__auth_mode") {
      authMode = body().mode;
      return json({ ready: true });
    }
    if (path === "/__repository_project") {
      const state = body().state;
      project = {
        id: projectId,
        maker_id: owner,
        name: "Repository fixture",
        tagline: "A public repository ownership fixture",
        description: "A disposable ownership browser fixture. ".repeat(5),
        status: "published",
        version: 1,
        github_url: "https://github.com/fixture_maker/work",
        category_id: categoryId,
        published_at: new Date().toISOString(),
      };
      repositoryVerification = state
        ? {
            state,
            checked_at: new Date(Date.now() - 86400000).toISOString(),
            expires_at: new Date(
              Date.now() + (state === "expired" ? -1 : 89) * 86400000,
            ).toISOString(),
          }
        : null;
      return json({ ready: true });
    }
    if (path === "/__google_mode") {
      googleEnabled = true;
      authMode = body().onboarding ? "onboarding" : "active";
      user.app_metadata.provider = "google";
      return json({ ready: true });
    }
    if (path === "/__fail_save") {
      failSave = true;
      return json({ ready: true });
    }
    if (path === "/__seed_notices") {
      notices = Array.from({ length: 25 }, (_, i) => ({
        id: `80000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
        type: "follow",
        created_at: new Date(Date.now() - i * 1000).toISOString(),
        read_at: null,
        actor_username: "other_maker",
        actor_name: "Other maker",
        project_id: null,
        project_name: null,
      }));
      return json({ ready: true });
    }
    if (path === "/__hide_project") {
      project.status = "hidden";
      return json({ ready: true });
    }
    if (path === "/__restore_project") {
      project.status = "published";
      return json({ ready: true });
    }
    if (path === "/__seed_discovery") {
      discovery = Array.from({ length: 25 }, (_, i) => ({
        id: `10000000-0000-4000-a000-${String(i + 1).padStart(12, "0")}`,
        name: `Discovery project ${String(i + 1).padStart(2, "0")}`,
        tagline: "A real application flow in a disposable protocol fixture",
        description: "Fixture description",
        published_at: "2026-10-12T00:00:00Z",
        maker_id: "00000000-0000-4000-a000-000000000002",
        maker_username: "other_maker",
        maker_name: "Other maker",
        category: "Developer tools",
        category_slug: "developer-tools",
        stack: ["TypeScript"],
        upvote_count: 0,
      }));
      return json({ ready: true });
    }
    if (path === "/__shift_discovery") {
      discovery.push(discovery.shift());
      return json({ ready: true });
    }
    if (path === "/__fail_vote") {
      failVote = true;
      return json({ ready: true });
    }
    if (path === "/__state")
      return json({
        project,
        media,
        assetStates: [...assets.values()].map((asset) => asset.state),
        processedImages: [...files.keys()].filter((key) => key.startsWith("ark-media/")),
      });
    if (path === "/auth/v1/authorize") {
      const code = randomUUID();
      authCodes.set(code, url.searchParams.get("code_challenge"));
      const destination = new URL(url.searchParams.get("redirect_to"));
      destination.searchParams.set("code", code);
      response.writeHead(302, { Location: destination.toString() });
      response.end();
      return;
    }
    if (path === "/auth/v1/token") {
      const input = body(),
        challenge = authCodes.get(input.auth_code);
      authCodes.delete(input.auth_code);
      if (
        !challenge ||
        createHash("sha256")
          .update(input.code_verifier ?? "")
          .digest("base64url") !== challenge
      )
        return json({ error_code: "bad_code_verifier", msg: "Fixture verifier mismatch" }, 400);
      return json(authSession());
    }
    if (path === "/__fail_follow") {
      failFollow = true;
      return json({ ok: true });
    }
    if (path === "/auth/v1/logout")
      return authMode === "logout_error" ? json({ message: "Fixture outage" }, 503) : json(null);
    if (path === "/auth/v1/user")
      return request.headers.authorization?.includes("eyJ")
        ? json(user)
        : json({ message: "No session", code: "bad_jwt" }, 401);
    if (path === "/auth/v1/settings")
      return json({ external: { github: true, google: googleEnabled } });
    if (path === "/rest/v1/profiles" && authMode === "profile_error")
      return json({ code: "PGRST000", message: "Fixture profile unavailable" }, 503);
    if (path === "/rest/v1/profiles")
      return json([
        {
          id: owner,
          username:
            profileOverride?.username ?? (authMode === "onboarding" ? null : "fixture_maker"),
          display_name:
            profileOverride?.display_name ??
            (googleEnabled ? "Google fixture maker" : "Fixture maker"),
          bio: "Browser fixture only",
          github_username: googleEnabled ? null : "fixture_maker",
          github_connected_at: googleEnabled ? null : "2026-10-12T00:00:00Z",
          created_at: "2026-10-12T00:00:00Z",
        },
      ]);
    if (path === "/rest/v1/categories")
      return json([{ id: categoryId, slug: "developer-tools", name: "Developer tools" }]);
    if (path === "/rest/v1/technologies")
      return json([{ id: technologyId, slug: "typescript", name: "TypeScript" }]);
    if (path.startsWith("/rest/v1/rpc/")) {
      const name = path.split("/").pop(),
        input = body();
      if (name === "my_account_status")
        return json(authMode === "suspended" ? "suspended" : "active");
      if (name === "get_public_repository_verification") return json(repositoryVerification);
      if (name === "sync_my_github_identity") return json(null);
      if (name === "update_my_profile") {
        profileOverride = {
          username: input.p_username,
          display_name: input.p_display_name,
          bio: input.p_bio,
        };
        return json(null);
      }
      if (name === "list_collections")
        return json(
          collections.map((c) => ({ ...c, project_count: memberships.get(c.id)?.size ?? 0 })),
        );
      if (name === "get_public_collection") {
        const c = collections.find((c) => c.id === input.p_collection);
        return json(
          c ? { ...c, maker_username: "fixture_maker", maker_name: "Fixture maker" } : null,
        );
      }
      if (name === "get_my_saved_projects")
        return json(
          input.p_projects
            .filter((id) => [...memberships.values()].some((items) => items.has(id)))
            .map((project_id) => ({ project_id })),
        );
      if (name === "get_my_collection_picker")
        return json(
          collections.map((c) => ({
            id: c.id,
            title: c.title,
            is_default: c.is_default,
            contains_project: memberships.get(c.id)?.has(input.p_project) ?? false,
          })),
        );
      if (name === "create_collection") {
        if (!collections.some((c) => c.id === input.p_id)) {
          collections.push({
            id: input.p_id,
            owner_id: owner,
            title: input.p_title,
            description: input.p_description,
            is_default: false,
          });
          memberships.set(input.p_id, new Set());
        }
        return json(input.p_id);
      }
      if (name === "update_collection") {
        Object.assign(
          collections.find((c) => c.id === input.p_collection),
          { title: input.p_title, description: input.p_description },
        );
        return json(null);
      }
      if (name === "delete_collection") {
        collections = collections.filter((c) => c.id !== input.p_collection);
        memberships.delete(input.p_collection);
        return json(null);
      }
      if (name === "set_collection_item") {
        if (failSave) {
          failSave = false;
          return json({ code: "42501" }, 403);
        }
        let id = input.p_collection;
        if (!id) {
          id = collections.find((c) => c.is_default)?.id;
          if (!id && input.p_desired) {
            id = randomUUID();
            collections.unshift({
              id,
              owner_id: owner,
              title: "Saved",
              description: "",
              is_default: true,
            });
            memberships.set(id, new Set());
          }
        }
        if (id) {
          if (input.p_desired) memberships.get(id).add(input.p_project);
          else memberships.get(id).delete(input.p_project);
        }
        return json({
          collection_id: id ?? null,
          saved: [...memberships.values()].some((items) => items.has(input.p_project)),
        });
      }
      if (name === "list_collection_projects") {
        const ids = memberships.get(input.p_collection) ?? new Set();
        return json(
          (discovery ?? (summary() ? [summary()] : []))
            .filter((p) => ids.has(p.id))
            .map((p) => ({ ...p, added_at: "2026-10-13T00:00:00Z" })),
        );
      }
      if (name === "get_my_notification_status")
        return json({
          unread: notices.filter((n) => !n.read_at).length,
          cutoff: new Date().toISOString(),
        });
      if (name === "list_my_notifications")
        return json(
          notices
            .slice(input.p_after_id ? notices.findIndex((n) => n.id === input.p_after_id) + 1 : 0)
            .slice(0, input.p_limit ?? 21),
        );
      if (name === "mark_my_notifications_read") {
        for (const n of notices)
          if (input.p_ids?.includes(n.id) || (input.p_cutoff && n.created_at <= input.p_cutoff))
            n.read_at ||= new Date().toISOString();
        return json(null);
      }
      if (name === "get_my_notification_preferences") return json(preferences);
      if (name === "update_my_notification_preferences") {
        preferences = {
          follows: input.p_follows,
          upvotes: input.p_upvotes,
          launches: input.p_launches,
        };
        return json(null);
      }
      if (name === "get_public_profile") {
        const self = input.p_username === "fixture_maker";
        return json([
          {
            id: self ? owner : "00000000-0000-4000-a000-000000000002",
            username: self ? "fixture_maker" : "other_maker",
            display_name: self ? "Fixture maker" : "Other maker",
            bio: self ? "Browser fixture only" : "A test maker",
            github_username: null,
            github_connected_at: null,
            created_at: "2026-10-12T00:00:00Z",
          },
        ]);
      }
      if (name === "get_maker_follow_state")
        return json({ followers: Number(followed), following: 0, followed });
      if (name === "set_maker_follow") {
        if (failFollow) {
          failFollow = false;
          return json({ code: "42501", message: "Fixture denial" }, 403);
        }
        followed = input.p_desired;
        return json({ followers: Number(followed), following: 0, followed });
      }
      if (name === "list_maker_connections")
        return json(
          followed
            ? [
                {
                  id: owner,
                  username: "fixture_maker",
                  display_name: "Fixture maker",
                  bio: "Browser fixture only",
                },
              ]
            : [],
        );
      if (name === "get_public_maker_totals")
        return json({ projects: discovery?.length ?? (summary() ? 1 : 0), upvotes: votes.size });
      if (name === "get_my_project_votes")
        return json(
          input.p_projects.filter((id) => votes.has(id)).map((project_id) => ({ project_id })),
        );
      if (name === "set_project_upvote") {
        if (failVote) {
          failVote = false;
          return json({ code: "42501", message: "Fixture denial" }, 403);
        }
        if (input.p_desired) votes.add(input.p_project);
        else votes.delete(input.p_project);
        const row = discovery?.find((p) => p.id === input.p_project);
        if (row) row.upvote_count = Number(input.p_desired);
        return json({ count: Number(input.p_desired), upvoted: input.p_desired });
      }
      if (name === "prepare_project") {
        project = {
          ...input.p_input,
          id: projectId,
          maker_id: owner,
          version: (project?.version ?? 1) + 1,
          status: project?.status ?? "draft",
          published_at: project?.published_at ?? null,
          cover_media_id: project?.cover_media_id ?? null,
        };
        return json({ id: project.id, version: project.version, status: project.status });
      }
      if (name === "reserve_project_upload") {
        const id = randomUUID(),
          staging_key = `${owner}/${projectId}/${id}`;
        const asset = {
          id,
          project_id: projectId,
          owner_id: owner,
          staging_key,
          published_key: staging_key + ".webp",
          declared_type: input.p_type,
          declared_bytes: input.p_size,
          state: "reserved",
          lease_token: randomUUID(),
        };
        assets.set(id, asset);
        return json(asset);
      }
      if (name === "get_my_upload" || name === "claim_media_validation")
        return json(assets.get(input.p_asset));
      if (name === "complete_media_validation") {
        Object.assign(assets.get(input.p_asset), {
          state: "validated",
          size_bytes: input.p_size,
          width: input.p_width,
          height: input.p_height,
        });
        return json(null);
      }
      if (name === "reject_media_validation" || name === "discard_project_upload") {
        assets.get(input.p_asset).state = "rejected";
        return json(null);
      }
      if (name === "publish_project" || name === "edit_project") {
        if (name === "edit_project") Object.assign(project, input.p_input);
        media = input.p_ids.map((id, index) => {
          const asset = assets.get(id);
          if (asset) asset.state = "consumed";
          return {
            id,
            project_id: projectId,
            object_key: asset?.published_key ?? media.find((image) => image.id === id)?.object_key,
            alt_text: input.p_alt[index],
            width: asset?.width ?? 80,
            height: asset?.height ?? 60,
            position: index,
            is_cover: id === input.p_cover,
          };
        });
        if (name === "publish_project") project.status = "published";
        project.published_at ||= new Date().toISOString();
        project.cover_media_id = input.p_cover;
        project.version++;
        return json(name === "publish_project" ? projectId : project.version);
      }
      if (name === "get_public_project")
        return json(
          discovery ? discovery.filter((p) => p.id === input.p_id) : summary() ? [summary()] : [],
        );
      if (name === "list_projects") if (input.p_feed === "following" && !followed) return json([]);
      if (name === "list_projects")
        return json(
          discovery
            ? discovery
                .slice(
                  input.p_cursor ? discovery.findIndex((p) => p.id === input.p_cursor.id) + 1 : 0,
                )
                .slice(0, input.p_limit ?? 21)
            : summary()
              ? [summary()]
              : [],
        );
      if (name === "get_visible_project_media")
        return json(
          project?.status === "published"
            ? media.filter((image) => !input.p_covers_only || image.is_cover)
            : [],
        );
      if (name === "get_my_project")
        return json({ project, media, technology_ids: [technologyId], pinned });
      if (name === "get_pinned_projects") return json(pinned && summary() ? [summary()] : []);
      if (name === "set_profile_pin") {
        pinned = input.p_desired;
        return json(null);
      }
      if (name === "delete_project") {
        project.status = "deleted";
        return json(null);
      }
      if (name === "search_makers") return json([]);
      return json({ code: "PGRST202", message: "Unknown fixture RPC" }, 404);
    }
    const signedUpload = "/storage/v1/object/upload/sign/";
    if (path.startsWith(signedUpload)) {
      const key = decodeURIComponent(path.slice(signedUpload.length));
      if (request.method === "POST")
        return json({ url: `/object/upload/sign/${key}?token=fixture-upload` });
      if (request.headers["content-type"]?.includes("multipart/form-data")) {
        const form = await new Request(url, {
          method: "PUT",
          headers: request.headers,
          body: bytes,
        }).formData();
        const file = [...form.values()].find((value) => typeof value !== "string");
        files.set(key, Buffer.from(await file.arrayBuffer()));
      } else files.set(key, bytes);
      return json({ Key: key });
    }
    if (path === "/storage/v1/object/sign/ark-media")
      return json(
        body().paths.map((key) => ({
          path: key,
          signedURL: `/object/sign/ark-media/${key}?token=fixture-read`,
          error: null,
        })),
      );
    for (const prefix of [
      "/storage/v1/object/authenticated/",
      "/storage/v1/object/sign/",
      "/storage/v1/object/",
    ])
      if (request.method === "GET" && path.startsWith(prefix)) {
        const key = decodeURIComponent(path.slice(prefix.length));
        const image = files.get(key);
        if (!image) return json({ message: "Missing fixture image" }, 404);
        response.writeHead(200, {
          "Content-Type": key.endsWith(".webp") ? "image/webp" : "image/png",
        });
        response.end(image);
        return;
      }
    if (path.startsWith("/storage/v1/object/ark-media/") && request.method === "POST") {
      const key = decodeURIComponent(path.slice("/storage/v1/object/".length));
      files.set(key, bytes);
      return json({ Key: key });
    }
    return json({ message: "Unknown fixture route" }, 404);
  } catch (error) {
    console.error("Fixture protocol error:", error.message);
    return json({ message: "Fixture protocol failure" }, 500);
  }
});
server.listen(55431, "127.0.0.1", () =>
  console.log("Publishing protocol fixture ready on 127.0.0.1:55431"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
