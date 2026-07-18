import { NextResponse } from "next/server";
import { devLogin, supabaseConfigured } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (supabaseConfigured())
    return NextResponse.json({ error: "الدخول عبر Google مفعّل" }, { status: 400 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const ok = await devLogin(password ?? "");
  if (!ok) return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
