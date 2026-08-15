/**
 * لقطة أعمال خزف — تجمع أرقام المتجر الحقيقية لتغذية المساعد الذكي.
 * كل الأرقام من نفس مصادر اللوحة (طلبات غير اختبارية وغير ملغاة).
 */
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

const n = (v: unknown) => (v == null ? 0 : Number(v));
const f = (v: unknown) => n(v).toLocaleString("en");
const pct = (cur: number, prev: number) =>
  prev > 0 ? `${cur >= prev ? "+" : ""}${Math.round(((cur - prev) / prev) * 100)}٪` : (cur > 0 ? "جديد" : "٠");

export async function buildSnapshot(): Promise<string> {
  const [periods, topProd, topView, custRow, repeatRow, funnelRow, abandRow, revRow, coffeeStock] =
    await Promise.all([
      db.execute(sql`
        SELECT
          count(*) FILTER (WHERE created_at::date = now()::date) AS o_today,
          COALESCE(SUM(total) FILTER (WHERE created_at::date = now()::date),0) AS r_today,
          count(*) FILTER (WHERE created_at >= now()-interval '7 days') AS o7,
          COALESCE(SUM(total) FILTER (WHERE created_at >= now()-interval '7 days'),0) AS r7,
          COALESCE(SUM(product_profit) FILTER (WHERE created_at >= now()-interval '7 days'),0) AS p7,
          count(*) FILTER (WHERE created_at >= now()-interval '14 days' AND created_at < now()-interval '7 days') AS o_p7,
          COALESCE(SUM(total) FILTER (WHERE created_at >= now()-interval '14 days' AND created_at < now()-interval '7 days'),0) AS r_p7,
          count(*) FILTER (WHERE created_at >= now()-interval '30 days') AS o30,
          COALESCE(SUM(total) FILTER (WHERE created_at >= now()-interval '30 days'),0) AS r30,
          COALESCE(SUM(product_profit) FILTER (WHERE created_at >= now()-interval '30 days'),0) AS p30,
          COALESCE(SUM(total) FILTER (WHERE created_at >= now()-interval '60 days' AND created_at < now()-interval '30 days'),0) AS r_p30
        FROM orders WHERE is_test=false AND status <> 'CANCELLED'`),
      db.execute(sql`
        SELECT oi.name_snapshot AS name, SUM(oi.qty)::int AS qty, SUM(oi.line_total)::int AS revenue
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE o.is_test=false AND o.status<>'CANCELLED' AND o.created_at >= now()-interval '30 days'
        GROUP BY 1 ORDER BY revenue DESC LIMIT 6`),
      db.execute(sql`
        SELECT substring(path from '[?&][ct]=([^&]+)') AS slug, count(*)::int AS views
        FROM page_views
        WHERE created_at >= now()-interval '30 days' AND path LIKE '/product/%'
        GROUP BY 1 HAVING substring(path from '[?&][ct]=([^&]+)') IS NOT NULL
        ORDER BY views DESC LIMIT 6`),
      db.execute(sql`
        SELECT count(*) FILTER (WHERE created_at >= now()-interval '30 days') AS new30, count(*) AS total
        FROM customers WHERE phone NOT LIKE 'auth:%'`),
      db.execute(sql`
        SELECT count(*)::int AS repeats FROM (
          SELECT customer_phone FROM orders WHERE is_test=false AND status<>'CANCELLED'
          GROUP BY customer_phone HAVING count(*) >= 2) t`),
      db.execute(sql`
        WITH sess AS (
          SELECT session_id, count(*) AS pages,
            bool_or(path LIKE '/product/%') AS viewed,
            bool_or(path LIKE '/checkout%') AS checkout
          FROM page_views WHERE created_at >= now()-interval '30 days'
          GROUP BY session_id)
        SELECT count(*)::int AS sessions,
          count(*) FILTER (WHERE pages=1)::int AS single,
          count(*) FILTER (WHERE viewed)::int AS viewed,
          count(*) FILTER (WHERE checkout)::int AS checkout
        FROM sess`),
      db.execute(sql`
        SELECT count(*)::int AS carts, COALESCE(SUM(items_total),0)::int AS value
        FROM abandoned_carts
        WHERE recovered=false AND phone IS NOT NULL AND created_at >= now()-interval '30 days'`),
      db.execute(sql`SELECT count(*)::int AS pending FROM reviews WHERE status='PENDING'`),
      db.execute(sql`
        SELECT p.name, COALESCE(SUM(b.qty_remaining),0)::int AS remaining
        FROM products p LEFT JOIN inventory_batches b ON b.product_id=p.id
        WHERE p.active=true AND p.type='COFFEE'
        GROUP BY p.id, p.name ORDER BY remaining ASC LIMIT 5`),
    ]);

  const p = periods.rows[0] as Record<string, unknown>;
  const c = custRow.rows[0] as Record<string, unknown>;
  const fn = funnelRow.rows[0] as Record<string, unknown>;
  const ab = abandRow.rows[0] as Record<string, unknown>;
  const sessions = n(fn.sessions), single = n(fn.single), viewed = n(fn.viewed), checkout = n(fn.checkout);
  const bounce = sessions > 0 ? Math.round((single / sessions) * 100) : 0;

  const topProdTxt = topProd.rows.length
    ? topProd.rows.map((r) => `${r.name}: ${f((r as { revenue: unknown }).revenue)} د.ع (${f((r as { qty: unknown }).qty)} قطعة)`).join(" · ")
    : "لا مبيعات";
  const topViewTxt = topView.rows.length
    ? topView.rows.map((r) => `${r.slug} (${f((r as { views: unknown }).views)} مشاهدة)`).join(" · ")
    : "لا زيارات منتجات";
  const stockTxt = coffeeStock.rows.length
    ? coffeeStock.rows.map((r) => `${r.name}: ${f((r as { remaining: unknown }).remaining)}غ`).join(" · ")
    : "—";

  const today = new Date().toISOString().slice(0, 10);
  return [
    `تاريخ اليوم: ${today}`,
    ``,
    `— المبيعات —`,
    `اليوم: ${f(p.o_today)} طلب · ${f(p.r_today)} د.ع`,
    `آخر ٧ أيام: ${f(p.o7)} طلب · ${f(p.r7)} د.ع · ربح ${f(p.p7)} د.ع (مقابل ٧ أيام قبلها ${f(p.r_p7)} د.ع → ${pct(n(p.r7), n(p.r_p7))})`,
    `آخر ٣٠ يوم: ${f(p.o30)} طلب · ${f(p.r30)} د.ع · ربح ${f(p.p30)} د.ع (مقابل ٣٠ يوم قبلها ${f(p.r_p30)} د.ع → ${pct(n(p.r30), n(p.r_p30))})`,
    ``,
    `— المنتجات (٣٠ يوم) —`,
    `الأكثر مبيعاً: ${topProdTxt}`,
    `الأكثر مشاهدةً: ${topViewTxt}`,
    `رصيد القهوة: ${stockTxt}`,
    ``,
    `— الزوّار (٣٠ يوم) —`,
    `الزيارات: ${f(sessions)} · دخلوا وخرجوا فوراً (ارتداد): ${bounce}٪`,
    `شافوا منتجاً: ${f(viewed)} · وصلوا الدفع: ${f(checkout)} · اشتروا: ${f(p.o30)}`,
    ``,
    `— العملاء —`,
    `إجمالي العملاء: ${f(c.total)} · جدد (٣٠ يوم): ${f(c.new30)} · عملاء متكرّرون (طلبان+): ${f((repeatRow.rows[0] as { repeats: unknown }).repeats)}`,
    `سلات متروكة بأرقام هواتف (٣٠ يوم): ${f(ab.carts)} سلة بقيمة ${f(ab.value)} د.ع — قابلة للاسترجاع`,
    `تقييمات بانتظار المراجعة: ${f((revRow.rows[0] as { pending: unknown }).pending)}`,
  ].join("\n");
}
