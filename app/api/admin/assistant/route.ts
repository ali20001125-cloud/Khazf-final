/** مساعد خزف الذكي — دردشة محمية بالمدير. يبني لقطة المتجر ويسأل Gemini. */
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";
import { askGemini, type Turn } from "@/lib/server/gemini";
import { buildSnapshot } from "@/lib/server/snapshot";
import { assistantSystem } from "@/lib/server/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  let body: { question?: string; history?: Turn[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 }); }
  const question = (body.question || "").trim();
  if (!question) return NextResponse.json({ error: "اكتب سؤالك" }, { status: 400 });

  /* سجل المحادثة — آخر ٦ أدوار فقط لتوفير الاستهلاك */
  const history: Turn[] = Array.isArray(body.history)
    ? body.history.filter((t) => (t.role === "user" || t.role === "model") && typeof t.text === "string").slice(-6)
    : [];

  const snapshot = await buildSnapshot();
  const turns: Turn[] = [...history, { role: "user", text: question }];
  const res = await askGemini(assistantSystem(snapshot), turns);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
  return NextResponse.json({ answer: res.text });
}
