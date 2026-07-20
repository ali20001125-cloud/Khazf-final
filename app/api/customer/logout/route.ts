import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export const runtime = "nodejs";
export async function POST() {
  const jar = await cookies();
  jar.set("khz_customer", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
