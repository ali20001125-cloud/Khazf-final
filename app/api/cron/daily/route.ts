import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { notifyTelegram } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ملخّص يومي بالتيليجرام.
 * يُستدعى من Cron Job بهوستنجر مرة يومياً:
 *   GET https://khazf.shop/api/cron/daily?key=CRON_SECRET
 * محمي بمفتاح سرّي (CRON_SECRET بمتغيرات البيئة).
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  // منع التكرار بنفس اليوم
  const dup = await db.execute(sql`SELECT 1 FROM daily_digests WHERE digest_date = ${today} LIMIT 1`);
  if ((dup.rowCount ?? 0) > 0) return NextResponse.json({ ok: true, skipped: "أُرسل اليوم" });

  const m = (n: number) => n.toLocaleString("en");

  // أرقام آخر ٢٤ ساعة
  const stats = (await db.execute(sql`
    SELECT
      (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= now() - interval '1 day')::int AS visitors,
      (SELECT COUNT(*) FROM page_views WHERE created_at >= now() - interval '1 day')::int AS views,
      (SELECT COUNT(*) FROM orders WHERE created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS orders,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS revenue,
      (SELECT COALESCE(SUM(product_profit),0) FROM orders WHERE created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS profit,
      (SELECT COUNT(*) FROM abandoned_carts WHERE recovered = false AND updated_at < now() - interval '1 hour' AND updated_at >= now() - interval '1 day')::int AS abandoned,
      (SELECT COALESCE(SUM(items_total),0) FROM abandoned_carts WHERE recovered = false AND updated_at < now() - interval '1 hour' AND updated_at >= now() - interval '1 day')::int AS abandoned_value,
      (SELECT COUNT(*) FROM customers WHERE created_at >= now() - interval '1 day')::int AS new_customers
  `)).rows[0] as unknown as {
    visitors: number; views: number; orders: number; revenue: number;
    profit: number; abandoned: number; abandoned_value: number; new_customers: number;
  };

  // أكثر منتج مبيعاً أمس
  const topProduct = (await db.execute(sql`
    SELECT oi.name_snapshot AS name, SUM(oi.qty)::int AS qty
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= now() - interval '1 day' AND o.status <> 'CANCELLED'
    GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 1`)).rows[0] as unknown as { name: string; qty: number } | undefined;

  const conv = stats.visitors > 0 ? ((stats.orders / stats.visitors) * 100).toFixed(1) : "0";

  const text =
    `📊 <b>ملخّص خزف اليومي</b>\n` +
    `${today}\n` +
    `━━━━━━━━━━━━\n` +
    `👥 الزوار: <b>${m(stats.visitors)}</b> (${m(stats.views)} مشاهدة)\n` +
    `🛒 الطلبات: <b>${m(stats.orders)}</b>\n` +
    `💰 المبيعات: <b>${m(stats.revenue)} د.ع</b>\n` +
    `📈 الربح: <b>${m(stats.profit)} د.ع</b>\n` +
    `🎯 التحويل: <b>${conv}٪</b>\n` +
    `🆕 عملاء جدد: <b>${m(stats.new_customers)}</b>\n` +
    (topProduct ? `⭐ الأكثر مبيعاً: <b>${topProduct.name}</b> (${topProduct.qty})\n` : "") +
    `━━━━━━━━━━━━\n` +
    `🔔 سلات مهجورة: <b>${m(stats.abandoned)}</b>` +
    (stats.abandoned_value > 0 ? ` (${m(stats.abandoned_value)} د.ع معلّقة)` : "");

  const sent = await notifyTelegram(text);
  if (sent) await db.insert(s.dailyDigests).values({ digestDate: today });

  return NextResponse.json({ ok: sent });
}
