import { NextResponse } from "next/server";
import { clearCustomerCookie } from "@/lib/server/customer-session";

export const runtime = "nodejs";

export async function POST() {
  await clearCustomerCookie();
  return NextResponse.json({ ok: true });
}
