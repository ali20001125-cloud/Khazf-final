import { NextResponse } from "next/server";
import { db, schema as s } from "@/lib/server/db";
import { sql } from "drizzle-orm";
import { getAdmin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** تتبّع زيارة صفحة — خفيف، صامت. لا نحسب زيارات المدير (تشوّه الأرقام). */
export async function POST(req: Request) {
  try {
    // لا نتتبّع صاحب المتجر/المدير عند تصفّحه المتجر
    // بيئة الاختبار لا تُسجّل زيارات إطلاقاً
    if (process.env.NEXT_PUBLIC_ENV === "staging")
      return NextResponse.json({ ok: true, skipped: "staging" });

    const admin = await getAdmin().catch(() => null);
    if (admin) return NextResponse.json({ ok: true, skipped: "admin" });

    // أجهزة الاختبار المستثناة (كوكي khz_no_track من صفحة /no-track)
    const cookie = req.headers.get("cookie") ?? "";
    if (cookie.includes("khz_no_track=1")) return NextResponse.json({ ok: true, skipped: "device" });

    const b = await req.json();
    if (!b.sessionId || !b.path) return NextResponse.json({ ok: false });

    // استبعاد الزواحف — تفتح الصفحة لجلب المعاينة ثم تخرج فوراً فتُظهر جلسات بصفر ثانية
    const ua = req.headers.get("user-agent") ?? "";
    if (/bot|crawl|spider|facebookexternalhit|facebookcatalog|instagram|whatsapp|telegram|preview|slurp|bingpreview|headless|lighthouse|gtmetrix|pingdom|monitor|python-requests|curl|wget/i.test(ua))
      return NextResponse.json({ ok: true, skipped: "bot" });
    await db.insert(s.pageViews).values({
      sessionId: String(b.sessionId).slice(0, 60),
      visitorId: b.visitorId ? String(b.visitorId).slice(0, 60) : null,
      path: String(b.path).slice(0, 200),
      referrer: b.referrer ? String(b.referrer).slice(0, 200) : null,
      device: b.device ? String(b.device).slice(0, 20) : null,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
