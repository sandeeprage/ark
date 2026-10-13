"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reportContent(input: unknown) {
  const parsed = z
    .object({
      kind: z.enum(["project", "maker"]),
      target: z.uuid(),
      reason: z.enum(["spam", "harassment", "unsafe", "rights", "other"]),
      details: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "Choose a reason and explain the concern in 10–2,000 characters." };
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "Sign in to submit a report." };
  const result = await client.rpc("report_content", {
    p_kind: parsed.data.kind,
    p_target: parsed.data.target,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details,
  });
  if (result.error)
    return {
      error:
        result.error.code === "23505"
          ? "You already have an open report for this content."
          : result.error.code === "P0001"
            ? "You have reached the daily report limit. Contact support for an urgent concern."
            : "The report could not be submitted. Try again or contact support.",
    };
  return {
    success: "Report submitted. An administrator can review it; your report is not public.",
  };
}
export async function moderateReport(input: unknown) {
  const parsed = z
    .object({
      id: z.uuid(),
      action: z.enum(["dismiss", "hide", "restore", "suspend", "reinstate"]),
      reason: z.string().trim().min(10).max(2000),
    })
    .safeParse(input);
  if (!parsed.success)
    return { error: "Choose an action and give a reason in 10–2,000 characters." };
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { error: "Sign in again." };
  const result = await client.rpc("moderate_report", {
    p_report: parsed.data.id,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return {
      error:
        "This action could not be completed. Check your administrator access and the content's current state.",
    };
  revalidatePath("/", "layout");
  return { success: "Decision saved and recorded in the moderation audit." };
}
