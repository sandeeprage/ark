// Run only against the disposable database named by PGDATABASE.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile);
if (!process.env.PGDATABASE || !process.env.PGDATABASE.startsWith("ark_"))
  throw Error("A disposable ark_* test database is required.");
const psql = process.env.PSQL_EXECUTABLE || "psql";
const maker = "90000000-0000-4000-a000-000000000001",
  voter = "90000000-0000-4000-a000-000000000002",
  other = "90000000-0000-4000-a000-000000000003",
  project = "91000000-0000-4000-a000-000000000001";
async function sql(text) {
  return (await exec(psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", text])).stdout.trim();
}
async function vote(actor, desired) {
  const text = await sql(
    `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);select public.set_project_upvote('${project}',${desired});commit;`,
  );
  return JSON.parse(text.split(/\r?\n/).at(-1));
}
try {
  await sql(
    `insert into auth.users(id,email_confirmed_at) values('${maker}',now()),('${voter}',now()),('${other}',now());update public.profiles set username='race_'||right(id::text,1),display_name='Concurrency fixture' where id in ('${maker}','${voter}','${other}');insert into public.projects(id,maker_id,name,tagline,description,category_id,status,published_at,publish_request_key,release_url) values('${project}','${maker}','Concurrent fixture','A concurrency test fixture',repeat('Description. ',20),(select id from public.categories where slug='developer-tools'),'published',now(),gen_random_uuid(),'https://example.test/concurrency');`,
  );
  const retries = await Promise.all(Array.from({ length: 12 }, () => vote(voter, true)));
  assert(retries.every((r) => r.count === 1 && r.upvoted));
  const additions = await Promise.all(Array.from({ length: 8 }, () => vote(other, true)));
  assert(additions.every((r) => r.count === 2));
  const removals = await Promise.all(Array.from({ length: 12 }, () => vote(voter, false)));
  assert(removals.every((r) => r.count === 1 && !r.upvoted));
  assert.equal(await sql(`select count(*) from public.upvotes where project_id='${project}'`), "1");
  assert.equal(
    await sql(`select count(*) from public.notifications where project_id='${project}'`),
    "2",
  );
  console.log(
    "PASS: parallel adds/removals return authoritative totals without duplicate votes or notifications",
  );
} finally {
  await sql(
    `delete from auth.users where id in ('${maker}','${voter}','${other}');delete from private.rate_limits where subject_key in ('${voter}','${other}');`,
  );
}
