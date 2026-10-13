import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, cp, unlink } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import sharp from "sharp";

// No dotenv loading, connection URL, remote host, or operator-supplied database name.
if (
  process.env.ARK_RESTORE_TEST !== "1" ||
  process.env.PGUSER !== "ark_test" ||
  !["127.0.0.1", "localhost"].includes(process.env.PGHOST)
)
  throw new Error(
    "Set ARK_RESTORE_TEST=1, PGUSER=ark_test and a loopback PGHOST for this disposable test.",
  );
if (process.env.PGHOSTADDR && !["127.0.0.1", "::1"].includes(process.env.PGHOSTADDR))
  throw new Error("Remote PGHOSTADDR is forbidden.");
const container = process.env.ARK_RESTORE_CONTAINER;
if (container && !/^[a-zA-Z0-9_-]+$/.test(container))
  throw new Error("Invalid test container identifier.");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tag = randomBytes(6).toString("hex");
const databases = [`ark_restore_${tag}_source`, `ark_restore_${tag}_target`];
const artifacts = join(root, ".vercel", "restore-tests", tag);
await mkdir(artifacts, { recursive: true });
const env = { ...process.env, PGHOST: "127.0.0.1", PGTZ: "UTC", PGDATABASE: "postgres" };
delete env.PGSERVICE;
delete env.PGSERVICEFILE;
delete env.PGOPTIONS;
const created = [];
let log = "";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function pg(tool, args, input) {
  const binary = container
    ? "docker"
    : process.env.PG_BIN
      ? join(process.env.PG_BIN, `${tool}${process.platform === "win32" ? ".exe" : ""}`)
      : tool;
  const invocation = container
    ? [
        "exec",
        "-i",
        "-e",
        "PGUSER",
        "-e",
        "PGPASSWORD",
        "-e",
        "PGHOST",
        "-e",
        "PGPORT",
        container,
        tool,
        ...args,
      ]
    : args;
  return await new Promise((accept, reject) => {
    const child = spawn(binary, invocation, {
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const output = [],
      errors = [];
    let received = 0;
    let failure;
    const timer = setTimeout(() => {
      failure = new Error(`${tool} exceeded the 60-second synthetic-test limit.`);
      child.kill();
    }, 60_000);
    const collect = (target, bytes) => {
      received += bytes.length;
      if (received > 64 * 1024 * 1024) {
        failure = new Error(`${tool} exceeded the synthetic-test output limit.`);
        child.kill();
      } else target.push(bytes);
    };
    child.stdout.on("data", (bytes) => collect(output, bytes));
    child.stderr.on("data", (bytes) => collect(errors, bytes));
    child.stdin.on("error", () => {});
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const stderr = Buffer.concat(errors).toString();
      log += `${tool} ${code}\n${stderr}\n`;
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${tool} failed: ${stderr.slice(-2000)}`));
      else accept({ stdout: Buffer.concat(output), stderr });
    });
    child.stdin.end(input ?? "");
  });
}
const sql = (database, input) =>
  pg("psql", ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-d", database], input);
function objectPath(base, bucket, key) {
  if (!["ark-media", "ark-avatars"].includes(bucket) || !/^[a-z0-9/.-]+$/.test(key))
    throw new Error("Invalid fixture object path.");
  const path = resolve(base, bucket, key);
  if (!path.startsWith(resolve(base) + sep)) throw new Error("Fixture path escaped its root.");
  return path;
}
const objects = [
  {
    bucket: "ark-media",
    key: "11111111-1111-4111-a111-111111111111/44444444-4444-4444-a444-444444444444/66666666-6666-4666-a666-666666666666.webp",
  },
  {
    bucket: "ark-media",
    key: "22222222-2222-4222-a222-222222222222/55555555-5555-4555-a555-555555555555/77777777-7777-4777-a777-777777777777.webp",
  },
  {
    bucket: "ark-avatars",
    key: "avatars/11111111-1111-4111-a111-111111111111/88888888-8888-4888-a888-888888888888.webp",
  },
];
try {
  for (const database of databases) {
    await pg("createdb", ["--template=template0", database]);
    created.push(database);
  }
  const [source, target] = databases;
  await sql(source, await readFile(join(root, "tests/database/auth-stub.sql")));
  const { readdir } = await import("node:fs/promises");
  const migrations = (await readdir(join(root, "supabase/migrations")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const migration of migrations)
    await sql(source, await readFile(join(root, "supabase/migrations", migration)));
  console.log(`Applied ${migrations.length} migrations to the disposable source.`);
  const cover = await sharp({
    create: { width: 160, height: 80, channels: 3, background: "#171717" },
  })
    .webp()
    .toBuffer();
  const avatar = await sharp({
    create: { width: 512, height: 512, channels: 3, background: "#252525" },
  })
    .webp()
    .toBuffer();
  const storageSource = join(artifacts, "storage-source"),
    storageTarget = join(artifacts, "storage-restored");
  const manifest = [];
  for (const object of objects) {
    const bytes = object.bucket === "ark-media" ? cover : avatar;
    const path = objectPath(storageSource, object.bucket, object.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    manifest.push({ ...object, sha256: sha(bytes), bytes: bytes.length });
  }
  const seed = (await readFile(join(root, "tests/database/restore-seed.sql"), "utf8")).replaceAll(
    "__COVER_BYTES__",
    String(cover.length),
  );
  await sql(source, seed);
  const fingerprintSQL = await readFile(join(root, "tests/database/restore-fingerprint.sql"));
  const before = JSON.parse((await sql(source, fingerprintSQL)).stdout.toString());
  const dumpStarted = performance.now();
  const archive = (await pg("pg_dump", ["--format=custom", "--dbname", source])).stdout;
  const dumpMs = Math.round(performance.now() - dumpStarted);
  await writeFile(join(artifacts, "database.dump"), archive);
  const restoreStarted = performance.now();
  await pg("pg_restore", ["--exit-on-error", "--single-transaction", "--dbname", target], archive);
  const restoreMs = Math.round(performance.now() - restoreStarted);
  const after = JSON.parse((await sql(target, fingerprintSQL)).stdout.toString());
  if (!isDeepStrictEqual(before, after)) {
    await writeFile(join(artifacts, "before-fingerprint.json"), JSON.stringify(before, null, 2));
    await writeFile(join(artifacts, "after-fingerprint.json"), JSON.stringify(after, null, 2));
    const changed = Object.keys(before).filter(
      (key) => !isDeepStrictEqual(before[key], after[key]),
    );
    throw new Error(`Restored fingerprint differs: ${changed.join(", ")}`);
  }
  const checks = await sql(target, await readFile(join(root, "tests/database/restore-verify.sql")));
  const assertions = (checks.stderr.match(/NOTICE:\s+PASS:/g) ?? []).length;
  const refs = JSON.parse(
    (
      await sql(
        target,
        "select jsonb_agg(t) from (select 'ark-media' as bucket,object_key as key from public.project_media union all select 'ark-avatars',avatar_object_key from public.profiles where avatar_object_key is not null)t;",
      )
    ).stdout.toString(),
  );
  await cp(storageSource, storageTarget, { recursive: true });
  async function verifyObjects() {
    if (refs.length !== manifest.length)
      throw new Error("Restored object references differ from the backup manifest.");
    for (const ref of refs) {
      const expected = manifest.find(
        (object) => object.bucket === ref.bucket && object.key === ref.key,
      );
      const bytes = await readFile(objectPath(storageTarget, ref.bucket, ref.key));
      if (!expected || expected.sha256 !== sha(bytes) || expected.bytes !== bytes.length)
        throw new Error("Restored media differs from its backup manifest.");
    }
  }
  await verifyObjects();
  // Prove the verification also detects a missing object, rather than testing only a happy path.
  await unlink(objectPath(storageTarget, objects[0].bucket, objects[0].key));
  let detected = false;
  try {
    await verifyObjects();
  } catch {
    detected = true;
  }
  if (!detected) throw new Error("Missing media was not detected.");
  await writeFile(objectPath(storageTarget, objects[0].bucket, objects[0].key), cover);
  await verifyObjects();
  const summary = {
    scope: "local synthetic databases and local object copies; not a managed Supabase restore",
    migrations: migrations.length,
    restored_tables: Object.keys(before.data).length,
    data_and_schema_match: true,
    restore_assertions: assertions,
    storage_objects_verified: manifest.length,
    missing_object_detection: detected,
    archive_bytes: archive.length,
    archive_sha256: sha(archive),
    dump_ms: dumpMs,
    restore_ms: restoreMs,
    measured_at: new Date().toISOString(),
  };
  await writeFile(join(artifacts, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  console.log(`Local artifacts: ${artifacts}`);
} finally {
  // Only database names generated AND successfully created by this invocation are dropped.
  for (const database of created.reverse()) await pg("dropdb", [database]);
  await writeFile(join(artifacts, "verification.log"), log);
}
