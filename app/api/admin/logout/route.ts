import { NextResponse } from "next/server";
import { adminLogout } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await adminLogout();
  return NextResponse.json({ ok: true });
}
