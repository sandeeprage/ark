import "server-only";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/config";

export async function getAuthProviders() {
  if (!isSupabaseConfigured()) return { state: "setup" as const, github: false, google: false };
  const { url, key } = supabaseConfig();
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { state: "error" as const, github: false, google: false };
    const data = await response.json();
    return {
      state: "ready" as const,
      github: Boolean(data.external?.github),
      google: Boolean(data.external?.google),
    };
  } catch {
    return { state: "error" as const, github: false, google: false };
  }
}
