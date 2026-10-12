"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export type PickerItem = {
  id: string;
  title: string;
  is_default: boolean;
  contains_project: boolean;
};
const fields = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
});
async function actor() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  return error || !user ? null : client;
}
function message(code?: string) {
  return code === "54000"
    ? "You can have up to 30 collections, including Saved."
    : code === "P0001"
      ? "Too many changes. Try again in a minute."
      : code === "42501"
        ? "Sign in with an active account to manage your collections."
        : "This change couldn’t be saved. Please try again.";
}
export async function collectionPicker(project: string) {
  if (!z.uuid().safeParse(project).success)
    return { ok: false as const, error: "Invalid project." };
  const client = await actor();
  if (!client) return { ok: false as const, error: "Sign in again to save projects." };
  const { data, error } = await client.rpc("get_my_collection_picker", { p_project: project });
  return error
    ? { ok: false as const, error: message(error.code) }
    : { ok: true as const, items: (data ?? []) as PickerItem[] };
}
export async function createCollection(id: string, title: string, description: string) {
  const parsed = fields.safeParse({ title, description });
  if (!parsed.success || !z.uuid().safeParse(id).success)
    return {
      ok: false as const,
      error: "Use a title of 1–80 characters and a description up to 500 characters.",
    };
  const client = await actor();
  if (!client) return { ok: false as const, error: "Sign in again." };
  const { data, error } = await client.rpc("create_collection", {
    p_id: id,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
  });
  if (error) return { ok: false as const, error: message(error.code) };
  revalidatePath("/collections");
  return { ok: true as const, id: data as string };
}
export async function updateCollection(id: string, title: string, description: string) {
  const parsed = fields.safeParse({ title, description });
  if (!parsed.success || !z.uuid().safeParse(id).success)
    return { ok: false as const, error: "Check the title and description lengths." };
  const client = await actor();
  if (!client) return { ok: false as const, error: "Sign in again." };
  const { error } = await client.rpc("update_collection", {
    p_collection: id,
    p_title: parsed.data.title,
    p_description: parsed.data.description,
  });
  if (error) return { ok: false as const, error: message(error.code) };
  revalidatePath("/collections", "layout");
  return { ok: true as const };
}
export async function deleteCollection(id: string) {
  if (!z.uuid().safeParse(id).success) return { ok: false as const, error: "Invalid collection." };
  const client = await actor();
  if (!client) return { ok: false as const, error: "Sign in again." };
  const { error } = await client.rpc("delete_collection", { p_collection: id });
  if (error) return { ok: false as const, error: message(error.code) };
  revalidatePath("/collections", "layout");
  return { ok: true as const };
}
export async function saveToCollection(
  project: string,
  collection: string | null,
  desired: boolean,
) {
  if (
    !z.uuid().safeParse(project).success ||
    (collection !== null && !z.uuid().safeParse(collection).success) ||
    typeof desired !== "boolean"
  )
    return { ok: false as const, error: "Invalid save request." };
  const client = await actor();
  if (!client) return { ok: false as const, error: "Sign in again to save projects." };
  const { data, error } = await client.rpc("set_collection_item", {
    p_project: project,
    p_collection: collection,
    p_desired: desired,
  });
  if (error) return { ok: false as const, error: message(error.code) };
  revalidatePath("/collections", "layout");
  return {
    ok: true as const,
    data: { collection_id: data.collection_id as string | null, saved: Boolean(data.saved) },
  };
}
