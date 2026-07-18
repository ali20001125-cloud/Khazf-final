import { NextResponse } from "next/server";
import { devLogin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const ok = await devLogin(password ?? "");
  if (!ok) return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
