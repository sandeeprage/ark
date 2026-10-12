import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Add the server-only Supabase secret key to .env.local first.");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (const id of ["ark-staging", "ark-media"]) {
  const { data: bucket } = await client.storage.getBucket(id);
  if (bucket) {
    if (bucket.public) throw new Error(`${id} must be private before uploads can be enabled.`);
    console.log(`${id}: private bucket ready`);
    continue;
  }
  const { error } = await client.storage.createBucket(id, {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes:
      id === "ark-staging" ? ["image/png", "image/jpeg", "image/webp"] : ["image/webp"],
  });
  if (error)
    throw new Error(`${id}: could not create bucket (${error.statusCode ?? "unavailable"})`);
  console.log(`${id}: created private bucket`);
}
