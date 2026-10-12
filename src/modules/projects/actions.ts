"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";
import { projectInputSchema, mediaSelectionSchema, uploadSchema } from "./validation";
import { sanitizeScreenshot } from "./image-validation";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; fields?: Record<string, string[]> };
function failure<T>(code: string): Result<T> {
  const messages: Record<string, string> = {
    "23505": "You already have a project using this destination. Edit that project instead.",
    "40001":
      "This project changed in another tab, or an upload is still processing. Reload before trying again.",
    "42501": "Sign in with an eligible, active account to make this change.",
    "22023": "Check the project details and screenshots, then try again.",
    "23514": "Check the field lengths, URLs, and screenshot requirements.",
    P0001: "You’ve reached today’s limit. Try again tomorrow.",
    storage_unavailable: "Screenshot storage isn’t configured yet. Your form has been kept.",
    not_authenticated: "Your session has expired. Sign in again.",
  };
  return {
    ok: false,
    code,
    error:
      messages[code] ??
      "This change couldn’t be completed. Your input has been kept; please try again.",
  };
}

async function actorClient() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: status, error: statusError } = await client.rpc("my_account_status");
  if (statusError || status !== "active") return null;
  return client;
}

export async function prepareProject(
  input: unknown,
  requestKey: string,
): Promise<Result<{ id: string; version: number; status: string }>> {
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      code: "validation_failed",
      error: "Check the highlighted fields.",
      fields: parsed.error.flatten().fieldErrors,
    };
  if (!z.uuid().safeParse(requestKey).success) return failure("22023");
  if (!isStorageConfigured()) return failure("storage_unavailable");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { data, error } = await client.rpc("prepare_project", {
    p_request_key: requestKey,
    p_input: parsed.data,
  });
  if (error) return failure(error.code);
  return { ok: true, data: data as { id: string; version: number; status: string } };
}

export async function authorizeProjectUpload(
  input: unknown,
): Promise<Result<{ id: string; path: string; token: string }>> {
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return failure("22023");
  if (!isStorageConfigured()) return failure("storage_unavailable");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { data, error } = await client.rpc("reserve_project_upload", {
    p_project: parsed.data.project_id,
    p_type: parsed.data.type,
    p_size: parsed.data.size,
  });
  if (error) return failure(error.code);
  const slot = data as { id: string; staging_key: string };
  // The reservation RPC checks ownership/eligibility and constructs the path.
  const { data: signed, error: signError } = await createAdminClient()
    .storage.from("ark-staging")
    .createSignedUploadUrl(slot.staging_key, { upsert: false });
  if (signError || !signed) {
    await client.rpc("discard_project_upload", { p_asset: slot.id });
    return failure("storage_unavailable");
  }
  return { ok: true, data: { id: slot.id, path: slot.staging_key, token: signed.token } };
}

type UploadAsset = {
  id: string;
  state: string;
  project_id: string;
  staging_key: string;
  published_key: string;
  declared_type: string;
  declared_bytes: number;
  lease_token: string;
};
export async function validateProjectUpload(assetId: string): Promise<Result<{ id: string }>> {
  if (!z.uuid().safeParse(assetId).success) return failure("22023");
  if (!isStorageConfigured()) return failure("storage_unavailable");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { error: accessError } = await client.rpc("get_my_upload", { p_asset: assetId });
  if (accessError) return failure(accessError.code);
  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.rpc("claim_media_validation", {
    p_asset: assetId,
  });
  if (claimError) return failure(claimError.code);
  const asset = claimed as UploadAsset;
  if (asset.state === "validated" || asset.state === "consumed")
    return { ok: true, data: { id: asset.id } };
  try {
    const { data: file, error: downloadError } = await admin.storage
      .from("ark-staging")
      .download(asset.staging_key);
    if (downloadError || !file)
      throw new Error("Upload couldn’t be read. Try uploading this screenshot again.");
    if (file.size !== asset.declared_bytes)
      throw new Error("The uploaded file size doesn’t match the selected screenshot.");
    const image = await sanitizeScreenshot(
      Buffer.from(await file.arrayBuffer()),
      asset.declared_type,
    );
    const { error: uploadError } = await admin.storage
      .from("ark-media")
      .upload(asset.published_key, image.bytes, {
        contentType: image.mime_type,
        cacheControl: "300",
        upsert: true,
      });
    if (uploadError) throw new Error("The screenshot couldn’t be processed. Try it again.");
    const { error: commitError } = await admin.rpc("complete_media_validation", {
      p_asset: assetId,
      p_token: asset.lease_token,
      p_size: image.size_bytes,
      p_width: image.width,
      p_height: image.height,
    });
    if (commitError) return failure(commitError.code);
    return { ok: true, data: { id: assetId } };
  } catch (error) {
    await admin.rpc("reject_media_validation", { p_asset: assetId, p_token: asset.lease_token });
    return {
      ok: false,
      code: "invalid_image",
      error: error instanceof Error ? error.message : "This screenshot couldn’t be processed.",
    };
  }
}

export async function publishProject(
  projectId: string,
  version: number,
  selection: unknown,
): Promise<Result<{ id: string }>> {
  const parsed = mediaSelectionSchema.safeParse(selection);
  if (!parsed.success || !z.uuid().safeParse(projectId).success || !Number.isInteger(version))
    return failure("22023");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { data, error } = await client.rpc("publish_project", {
    p_project: projectId,
    p_expected_version: version,
    p_ids: parsed.data.ids,
    p_alt: parsed.data.alt,
    p_cover: parsed.data.cover,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data as string } };
}

export async function editProject(
  projectId: string,
  version: number,
  input: unknown,
  selection: unknown,
): Promise<Result<{ version: number }>> {
  const parsed = projectInputSchema.safeParse(input);
  const media = mediaSelectionSchema.safeParse(selection);
  if (!parsed.success)
    return {
      ok: false,
      code: "validation_failed",
      error: "Check the highlighted fields.",
      fields: parsed.error.flatten().fieldErrors,
    };
  if (!media.success || !z.uuid().safeParse(projectId).success || !Number.isInteger(version))
    return failure("22023");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { data, error } = await client.rpc("edit_project", {
    p_project: projectId,
    p_expected_version: version,
    p_input: parsed.data,
    p_ids: media.data.ids,
    p_alt: media.data.alt,
    p_cover: media.data.cover,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { ok: true, data: { version: data as number } };
}

export async function deleteProject(projectId: string, name: string): Promise<Result<null>> {
  if (!z.uuid().safeParse(projectId).success || name.length > 80) return failure("22023");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { error } = await client.rpc("delete_project", { p_project: projectId, p_name: name });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function setProfilePin(projectId: string, desired: boolean): Promise<Result<null>> {
  if (!z.uuid().safeParse(projectId).success || typeof desired !== "boolean")
    return failure("22023");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { error } = await client.rpc("set_profile_pin", {
    p_project: projectId,
    p_desired: desired,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function discardProjectUpload(id: string): Promise<Result<null>> {
  if (!z.uuid().safeParse(id).success) return failure("22023");
  const client = await actorClient();
  if (!client) return failure("not_authenticated");
  const { error } = await client.rpc("discard_project_upload", { p_asset: id });
  return error ? failure(error.code) : { ok: true, data: null };
}
