"use server";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isStorageConfigured } from "@/lib/supabase/admin";
import { sanitizeScreenshot } from "@/modules/projects/image-validation";

export async function saveAvatar(
  _previous: { error?: string; success?: string; version?: string },
  form: FormData,
) {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user || !isStorageConfigured())
    return { error: "Sign in with an active account to change your avatar." };
  const { data: status, error: statusError } = await client.rpc("my_account_status");
  if (statusError || status !== "active") return { error: "An active account is required." };
  const admin = createAdminClient();
  if (form.get("remove") === "true") {
    const result = await admin.rpc("set_profile_avatar", { p_actor: user.id, p_key: null });
    if (result.error) return { error: "The avatar could not be removed. Try again." };
    revalidatePath("/", "layout");
    return { success: "Avatar removed.", version: crypto.randomUUID() };
  }
  let file = form.get("avatar");
  const provider = form.get("import_provider");
  if (!provider && (!(file instanceof File) || !file.size || file.size > 2 * 1024 * 1024))
    return { error: "Choose a PNG, JPEG, or WebP image up to 2 MiB." };
  const version = crypto.randomUUID();
  const key = `avatars/${user.id}/${version}.webp`;
  const reservation = await admin.rpc("reserve_profile_avatar", { p_actor: user.id, p_key: key });
  if (reservation.error)
    return {
      error: "Avatar upload is unavailable or the daily limit has been reached. Try again later.",
    };
  try {
    if (provider) {
      if (provider !== "github" && provider !== "google")
        return { error: "Choose a connected provider." };
      const identity = user.identities?.find((entry) => entry.provider === provider);
      const source = identity?.identity_data?.avatar_url || identity?.identity_data?.picture;
      if (typeof source !== "string")
        return {
          error:
            "This provider has no photo available. Choose an image from your computer instead.",
        };
      const url = new URL(source);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        ![
          "avatars.githubusercontent.com",
          "lh3.googleusercontent.com",
          "lh4.googleusercontent.com",
          "lh5.googleusercontent.com",
          "lh6.googleusercontent.com",
        ].includes(url.hostname)
      )
        return {
          error:
            "The provider photo cannot be imported safely. Choose an image from your computer instead.",
        };
      const response = await fetch(url, {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (
        !response.ok ||
        !response.body ||
        Number(response.headers.get("content-length")) > 2 * 1024 * 1024
      )
        return {
          error:
            "The provider photo could not be imported. Choose an image from your computer instead.",
        };
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          return { error: "Provider photos must be no larger than 2 MiB." };
        }
        chunks.push(part.value);
      }
      file = new File([Buffer.concat(chunks)], "provider-photo", {
        type: (response.headers.get("content-type") || "").split(";")[0],
      });
    }
    if (!(file instanceof File)) return { error: "Choose an image to continue." };
    const sanitized = await sanitizeScreenshot(Buffer.from(await file.arrayBuffer()), file.type);
    const image = await sharp(sanitized.bytes)
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
    const upload = await admin.storage
      .from("ark-avatars")
      .upload(key, image, { contentType: "image/webp", upsert: false });
    if (upload.error)
      return { error: "Your avatar could not be uploaded. Keep the image selected and try again." };
    const result = await admin.rpc("set_profile_avatar", { p_actor: user.id, p_key: key });
    if (result.error) {
      await admin.storage.from("ark-avatars").remove([key]);
      return { error: "Your avatar could not be saved. Try again." };
    }
    revalidatePath("/", "layout");
    return {
      success: "Avatar saved.",
      version,
      fileStamp: `${file.name}|${file.size}|${file.lastModified}`,
    };
  } catch (failure) {
    return {
      error:
        failure instanceof Error && /image|PNG|JPEG|WebP|decode|MiB|pixels/i.test(failure.message)
          ? failure.message
          : "Your avatar could not be saved. Try again.",
    };
  }
}
