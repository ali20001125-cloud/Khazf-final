import { NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, lt, gt, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { emailCartReminder } from "@/lib/server/email";
import { notifyAbandonedCartTelegram } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * تذكير السلات المتروكة — Cron Job (كل ساعة مثلاً):
 *   GET https://khazf.shop/api/cron/cart-reminders?key=CRON_SECRET
 * يرسل لمن: ترك سلته قبل ساعة+، له إيميل، لم يشترِ، لم يُشعَر بعد.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const site = process.env.SITE_URL || "https://khazf.shop";

  // إعدادات المتجر (لوغو + واتساب)
  const [cfg] = await db.select({ logoUrl: s.settings.logoUrl, whatsapp: s.settings.whatsapp })
    .from(s.settings).limit(1);

  // تقييمات منشورة (للمسة الاجتماعية) — نربطها باسم المنتج
  const revRows = await db.execute(sql`
    SELECT p.name AS product, ROUND(AVG(r.rating),1)::float AS rating,
           (SELECT comment FROM reviews r2 WHERE r2.product_id = p.id AND r2.status='PUBLISHED' AND r2.comment IS NOT NULL ORDER BY r2.created_at LIMIT 1) AS comment,
           (SELECT customer_name FROM reviews r3 WHERE r3.product_id = p.id AND r3.status='PUBLISHED' AND r3.comment IS NOT NULL ORDER BY r3.created_at LIMIT 1) AS author
    FROM reviews r JOIN products p ON p.id = r.product_id
    WHERE r.status='PUBLISHED' GROUP BY p.id, p.name`);
  const reviews: Record<string, { rating: number; comment?: string; author?: string }> = {};
  for (const r of revRows.rows as unknown as { product: string; rating: number; comment: string | null; author: string | null }[]) {
    reviews[r.product] = { rating: r.rating, comment: r.comment ?? undefined, author: r.author ?? undefined };
  }

  // السلات المؤهّلة: عمرها ساعة+ (وأقل من ٧ أيام)، لها إيميل، لم تُسترجع، لم تُشعَر
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const carts = await db.select().from(s.abandonedCarts).where(and(
    isNotNull(s.abandonedCarts.email),
    eq(s.abandonedCarts.recovered, false),
    eq(s.abandonedCarts.notified, false),
    lt(s.abandonedCarts.updatedAt, oneHourAgo),
    gt(s.abandonedCarts.updatedAt, sevenDaysAgo),
  )).limit(40); // حدّ أمان (بريد مجاني ١٠٠/يوم)

  let sent = 0;
  // عدّاد التناوب: نستخدم عدد المُشعَرين سابقاً لتدوير القالب
  const [{ c: already }] = (await db.execute(sql`SELECT COUNT(*)::int AS c FROM abandoned_carts WHERE notified = true`)).rows as unknown as { c: number }[];

  for (let i = 0; i < carts.length; i++) {
    const cart = carts[i];
    const items = (cart.items as { name: string; qty: number; price: number }[]) ?? [];
    if (items.length === 0 || !cart.email) continue;

    const tplId = await emailCartReminder({
      email: cart.email,
      name: cart.name,
      items,
      total: cart.itemsTotal,
      cartUrl: `${site}/cart/`,
      logoUrl: cfg?.logoUrl,
      whatsapp: cfg?.whatsapp,
      reviews,
    }, already + sent); // التناوب عبر كل الإرسالات

    if (tplId) {
      await db.update(s.abandonedCarts)
        .set({ notified: true, templateSent: tplId, notifiedAt: new Date() })
        .where(eq(s.abandonedCarts.id, cart.id));
      sent++;
    }
  }

  /* ── من له رقم بلا إيميل → إشعار تيليجرام للواتساب اليدوي (بعد 5 دقائق) ── */
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const waCarts = await db.select().from(s.abandonedCarts).where(and(
    isNull(s.abandonedCarts.email),
    isNotNull(s.abandonedCarts.phone),
    eq(s.abandonedCarts.recovered, false),
    eq(s.abandonedCarts.notified, false),
    lt(s.abandonedCarts.updatedAt, fiveMinAgo),
    gt(s.abandonedCarts.updatedAt, sevenDaysAgo),
  )).limit(20);

  let waSent = 0;
  for (const cart of waCarts) {
    const items = (cart.items as { name: string; qty: number; price: number }[]) ?? [];
    if (items.length === 0 || !cart.phone) continue;

    // نص واتساب تسويقي جاهز (بروح خزف — مهذّب بلا إلحاح)
    const itemNames = items.map((it) => it.name).join("، ");
    const waMessage =
      `مرحباً${cart.name ? " " + cart.name : ""} 🤎\n` +
      `لاحظنا أنك اخترت من خزف: ${itemNames}\n` +
      `منتجاتك ما زالت محفوظة، ويسعدنا إكمال طلبك متى شئت.\n` +
      `وإن كان عندك أي سؤال عن المحصول أو طريقة التحضير، نحن هنا.\n` +
      `khazf.shop`;

    const ok = await notifyAbandonedCartTelegram({
      name: cart.name,
      phone: cart.phone,
      items,
      itemsTotal: cart.itemsTotal,
      waMessage,
    });

    if (ok) {
      await db.update(s.abandonedCarts)
        .set({ notified: true, templateSent: "wa", notifiedAt: new Date() })
        .where(eq(s.abandonedCarts.id, cart.id));
      waSent++;
    }
  }

  return NextResponse.json({ ok: true, eligible: carts.length, sent, waEligible: waCarts.length, waSent });
}
