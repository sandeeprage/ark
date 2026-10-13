import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Verification = {
  state: "verified" | "expired";
  checked_at: string;
  expires_at: string;
};
export async function getRepositoryVerification(id: string): Promise<Verification | null> {
  const { data, error } = await (
    await createClient()
  ).rpc("get_public_repository_verification", { p_project: id });
  if (error || !data) return null;
  return data as Verification;
}
