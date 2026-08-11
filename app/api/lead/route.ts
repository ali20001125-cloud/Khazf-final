import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { emailBrewGuide } from "@/lib/server/email";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** تسجيل بريد زائر: دليل التحضير أو إشعار عودة منتج */
export async function POST(req: Request) {
  try {
    // تسجيل البريد قد يُطلق إيميلاً — نمنع الإغراق (١٠ كل دقيقة لكل IP)
    if (!rateLimit(`lead:${clientIp(req)}`, 10, 60_000))
      return NextResponse.json({ error: "محاولات كثيرة — انتظر قليلاً" }, { status: 429 });
    const b = await req.json();
    const email = String(b.email ?? "").trim().toLowerCase();
    const source = ["guide", "restock", "footer"].includes(String(b.source)) ? String(b.source) : "guide";
    const productSlug = b.productSlug ? String(b.productSlug).slice(0, 80) : null;

    if (!email || !email.includes("@") || !email.includes(".") || /\s/.test(email))
      return NextResponse.json({ error: "تأكّد من بريدك" }, { status: 400 });

    await db.insert(s.emailLeads)
      .values({ email: email.slice(0, 160), source, productSlug })
      .onConflictDoNothing();

    // دليل التحضير يُرسل فوراً
    if (source === "guide") {
      const site = process.env.SITE_URL ?? "https://khazf.shop";
      emailBrewGuide({ email, guideUrl: `${site}/guide/` }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر التسجيل — حاول ثانية" }, { status: 500 });
  }
}

/** عدد المسجّلين (للوحة) */
export async function GET() {
  const r = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE source = 'guide')::int AS guide,
      COUNT(*) FILTER (WHERE source = 'restock')::int AS restock,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week
    FROM email_leads`);
  return NextResponse.json(r.rows[0] ?? {});
}
