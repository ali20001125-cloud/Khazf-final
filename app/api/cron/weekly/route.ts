import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { notifyTelegram } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ملخّص أسبوعي بالتيليجرام (أشمل من اليومي — يقارن بالأسبوع السابق).
 * Cron Job بهوستنجر مرة أسبوعياً:
 *   GET https://khazf.shop/api/cron/weekly?key=CRON_SECRET
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const m = (n: number) => n.toLocaleString("en");
  const weekTag = new Date().toISOString().slice(0, 10);

  // منع التكرار بنفس الأسبوع (آخر ٦ أيام)
  const dup = await db.execute(sql`SELECT 1 FROM daily_digests WHERE digest_date = ${"W-" + weekTag} LIMIT 1`);
  if ((dup.rowCount ?? 0) > 0) return NextResponse.json({ ok: true, skipped: "أُرسل هذا الأسبوع" });

  // أرقام هذا الأسبوع مقابل السابق
  const stats = (await db.execute(sql`
    SELECT
      (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= now() - interval '7 days')::int AS visitors,
      (SELECT COUNT(*) FROM orders WHERE created_at >= now() - interval '7 days' AND status <> 'CANCELLED')::int AS orders,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= now() - interval '7 days' AND status <> 'CANCELLED')::int AS revenue,
      (SELECT COALESCE(SUM(product_profit),0) FROM orders WHERE created_at >= now() - interval '7 days' AND status <> 'CANCELLED')::int AS profit,
      (SELECT COUNT(*) FROM customers WHERE created_at >= now() - interval '7 days')::int AS new_customers,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days' AND status <> 'CANCELLED')::int AS prev_revenue,
      (SELECT COUNT(*) FROM orders WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days' AND status <> 'CANCELLED')::int AS prev_orders,
      (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '7 days')::int AS new_accounts,
      (SELECT COUNT(*) FROM auth.users)::int AS total_accounts,
      (SELECT COUNT(*) FROM customers)::int AS total_customers,
      (SELECT COUNT(*) FROM email_log WHERE created_at >= now() - interval '7 days')::int AS emails_week
  `)).rows[0] as unknown as {
    visitors: number; orders: number; revenue: number; profit: number;
    new_customers: number; prev_revenue: number; prev_orders: number;
    new_accounts: number; total_accounts: number; total_customers: number; emails_week: number;
  };

  // أفضل ٣ منتجات هذا الأسبوع
  const top = (await db.execute(sql`
    SELECT oi.name_snapshot AS name, SUM(oi.qty)::int AS qty
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= now() - interval '7 days' AND o.status <> 'CANCELLED'
    GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 3`)).rows as unknown as { name: string; qty: number }[];

  // اتجاه المبيعات (مقارنة بالأسبوع السابق)
  const trend = (() => {
    if (stats.prev_revenue === 0) return stats.revenue > 0 ? "📈 +100٪" : "—";
    const pct = (((stats.revenue - stats.prev_revenue) / stats.prev_revenue) * 100).toFixed(0);
    const n = Number(pct);
    return n > 0 ? `📈 +${pct}٪` : n < 0 ? `📉 ${pct}٪` : "ثابت";
  })();

  const conv = stats.visitors > 0 ? ((stats.orders / stats.visitors) * 100).toFixed(1) : "0";

  const text =
    `📅 <b>ملخّص خزف الأسبوعي</b>\n` +
    `آخر ٧ أيام\n` +
    `━━━━━━━━━━━━\n` +
    `👥 الزوار: <b>${m(stats.visitors)}</b>\n` +
    `🛒 الطلبات: <b>${m(stats.orders)}</b> (الأسبوع السابق: ${m(stats.prev_orders)})\n` +
    `💰 المبيعات: <b>${m(stats.revenue)} د.ع</b>\n` +
    `📊 مقارنة بالسابق: <b>${trend}</b>\n` +
    `📈 الربح: <b>${m(stats.profit)} د.ع</b>\n` +
    `🎯 التحويل: <b>${conv}٪</b>\n` +
    `🆕 عملاء جدد (طلبوا): <b>${m(stats.new_customers)}</b>\n` +
    `📝 حسابات جديدة: <b>${m(stats.new_accounts)}</b>\n` +
    `👥 إجمالي الحسابات: <b>${m(stats.total_accounts)}</b> · عملاء بطلبات: <b>${m(stats.total_customers)}</b>\n` +
    `✉️ بريد مُرسل هذا الأسبوع: <b>${m(stats.emails_week)}</b>\n` +
    (top.length > 0
      ? `━━━━━━━━━━━━\n⭐ <b>الأكثر مبيعاً:</b>\n` +
        top.map((t, i) => `${i + 1}. ${t.name} (${t.qty})`).join("\n")
      : "");

  const sent = await notifyTelegram(text);
  if (sent) {
    await db.insert(s.dailyDigests).values({ digestDate: "W-" + weekTag });
    return NextResponse.json({ ok: true, sent: true });
  }
  return NextResponse.json({ ok: false, reason: "تعذّر الإرسال للتيليجرام" }, { status: 502 });
}
