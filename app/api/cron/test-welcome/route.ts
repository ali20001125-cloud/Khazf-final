import { NextResponse } from "next/server";
import { emailWelcome } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * رابط اختبار مؤقت — يرسل رسالة الترحيب لبريد محدّد للمعاينة.
 *   GET /api/cron/test-welcome?key=CRON_SECRET&to=email&name=الاسم
 * يُحذف بعد الاختبار.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const to = url.searchParams.get("to");
  const name = url.searchParams.get("name") || "علي";
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!to) return NextResponse.json({ error: "أضف &to=إيميلك" }, { status: 400 });

  await emailWelcome({ email: to, name });
  return NextResponse.json({ ok: true, sent: "رسالة الترحيب", to, name });
}
