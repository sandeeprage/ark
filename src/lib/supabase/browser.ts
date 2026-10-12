"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/config";
export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
