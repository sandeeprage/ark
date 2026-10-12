// Disposable test database only. Fixtures are removed in finally.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
if (!process.env.PGDATABASE?.startsWith("ark_"))
  throw Error("A disposable ark_* database is required.");
const exec = promisify(execFile),
  psql = process.env.PSQL_EXECUTABLE || "psql";
const actor = "93000000-0000-4000-a000-000000000001",
  project = "94000000-0000-4000-a000-000000000001",
  collection = "95000000-0000-4000-a000-000000000001";
async function sql(statement) {
  return (await exec(psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement])).stdout.trim();
}
async function write(statement) {
  return (
    await sql(
      `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);${statement};commit;`,
    )
  )
    .split(/\r?\n/)
    .at(-1);
}
try {
  await sql(
    `insert into auth.users(id) values('${actor}');update public.profiles set username='collection_race' where id='${actor}';insert into public.projects(id,maker_id,name,tagline,description,category_id,status,published_at,publish_request_key,release_url) values('${project}','${actor}','Collection race','A collection concurrency fixture',repeat('Description. ',20),(select id from public.categories where slug='developer-tools'),'published',now(),gen_random_uuid(),'https://example.test/collection-race');`,
  );
  const creates = await Promise.all(
    Array.from({ length: 12 }, () =>
      write(`select public.create_collection('${collection}','Tools','')`),
    ),
  );
  assert(creates.every((id) => id === collection));
  const saves = await Promise.all(
    Array.from({ length: 12 }, () =>
      write(`select public.set_collection_item('${project}',null,true)`),
    ),
  );
  assert(saves.every((row) => JSON.parse(row).saved));
  assert.equal(new Set(saves.map((row) => JSON.parse(row).collection_id)).size, 1);
  assert.equal(
    await sql(`select count(*) from public.collection_items where project_id='${project}'`),
    "1",
  );
  const removes = await Promise.all(
    Array.from({ length: 12 }, () =>
      write(`select public.set_collection_item('${project}',null,false)`),
    ),
  );
  assert(removes.every((row) => !JSON.parse(row).saved));
  assert.equal(
    await sql(`select count(*) from public.notifications where actor_id='${actor}'`),
    "0",
  );
  console.log(
    "PASS: concurrent collection creation and default saves/removals stay unique without notifications",
  );
} finally {
  await sql(
    `delete from auth.users where id='${actor}';delete from private.rate_limits where subject_key='${actor}';`,
  );
}
