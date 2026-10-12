// Run only against a named disposable ark_* database.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const exec = promisify(execFile);
if (!process.env.PGDATABASE?.startsWith("ark_"))
  throw Error("A disposable ark_* test database is required.");
const psql = process.env.PSQL_EXECUTABLE || "psql";
const alice = "92000000-0000-4000-a000-000000000001",
  bob = "92000000-0000-4000-a000-000000000002";
async function sql(statement) {
  return (await exec(psql, ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-c", statement])).stdout.trim();
}
async function follow(actor, target, desired) {
  const result = await sql(
    `begin;set local statement_timeout='5s';set local role authenticated;select set_config('request.jwt.claim.sub','${actor}',true);select public.set_maker_follow('${target}',${desired});commit;`,
  );
  return JSON.parse(result.split(/\r?\n/).at(-1));
}
try {
  await sql(
    `insert into auth.users(id) values('${alice}'),('${bob}');update public.profiles set username='follow_race_'||right(id::text,1),display_name='Concurrent test maker' where id in ('${alice}','${bob}');`,
  );
  const additions = await Promise.all(Array.from({ length: 12 }, () => follow(alice, bob, true)));
  assert(additions.every((r) => r.followed && r.followers === 1));
  await Promise.all([follow(alice, bob, true), follow(bob, alice, true)]);
  assert.equal(
    await sql(`select count(*) from public.follows where follower_id in ('${alice}','${bob}')`),
    "2",
  );
  const removals = await Promise.all(Array.from({ length: 12 }, () => follow(alice, bob, false)));
  assert(removals.every((r) => !r.followed && r.followers === 0));
  assert.equal(
    await sql(`select count(*) from public.notifications where actor_id in ('${alice}','${bob}')`),
    "2",
  );
  console.log(
    "PASS: parallel follow/unfollow retries and reciprocal follows stay unique without deadlocks or repeated notifications",
  );
} finally {
  await sql(
    `delete from auth.users where id in ('${alice}','${bob}');delete from private.rate_limits where subject_key in ('${alice}','${bob}');`,
  );
}
