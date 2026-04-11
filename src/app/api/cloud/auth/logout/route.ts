import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { clearSessionCookie } from "@/lib/cloud-session";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";

export async function POST() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: true });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
