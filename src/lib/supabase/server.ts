import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/config";

export async function createClient() {
  const { url, key } = supabaseConfig();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (updates) => {
        try {
          updates.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Components cannot set cookies; proxy refreshes the session. */
        }
      },
    },
  });
}
