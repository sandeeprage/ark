// Disposable protocol fixture. Used only on localhost:55431 by the isolated
// publishing browser tests. It never connects to or inserts content into Supabase.
import http from "node:http";
import { randomUUID } from "node:crypto";
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
      project = null;
      assets = new Map();
      files = new Map();
      media = [];
      pinned = false;
      discovery = null;
      votes = new Set();
      failVote = false;
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
    if (path === "/auth/v1/user")
      return request.headers.authorization?.includes("eyJ")
        ? json(user)
        : json({ message: "No session", code: "bad_jwt" }, 401);
    if (path === "/auth/v1/settings") return json({ external: { github: true, google: false } });
    if (path === "/rest/v1/profiles")
      return json([
        {
          id: owner,
          username: "fixture_maker",
          display_name: "Fixture maker",
          bio: "Browser fixture only",
          github_username: "fixture_maker",
          github_connected_at: "2026-10-12T00:00:00Z",
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
      if (name === "my_account_status") return json("active");
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
        project.status = "published";
        project.published_at ||= new Date().toISOString();
        project.cover_media_id = input.p_cover;
        project.version++;
        return json(name === "publish_project" ? projectId : project.version);
      }
      if (name === "get_public_project")
        return json(
          discovery ? discovery.filter((p) => p.id === input.p_id) : summary() ? [summary()] : [],
        );
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
