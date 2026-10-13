import "server-only";
import { createClient } from "@supabase/supabase-js";

export function isStorageConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

// Call only after explicit application authorization. Never use for ordinary reads.
export function createAdminClient(options: { signal?: AbortSignal } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Server storage configuration is incomplete.");
  return createClient(url, key, {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            AbortSignal.timeout(10000),
            ...(init?.signal ? [init.signal] : []),
            ...(options.signal ? [options.signal] : []),
          ]),
        }),
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
