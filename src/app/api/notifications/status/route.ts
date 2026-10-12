import { NextResponse } from "next/server";
import { getViewer } from "@/modules/auth/session";
import { notificationStatus } from "@/modules/notifications/queries";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.status !== "active")
      return NextResponse.json({ error: "Sign in again." }, { status: 401, headers });
    return NextResponse.json(await notificationStatus(), { headers });
  } catch {
    return NextResponse.json(
      { error: "Notifications temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
