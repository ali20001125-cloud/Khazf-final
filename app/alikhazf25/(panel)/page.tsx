/** لوحة القيادة — مركز مهامك اليومية (طلبات · توصيل · زوار · مبيعات · عملاء) */
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { Package, Wallet, AlertTriangle, Star, Users, TrendingUp, ShoppingCart, Clock } from "@/components/admin/Icons";

export const dynamic = "force-dynamic";

async function runDueDeliveries() {
  try {
    const { and, eq, lt } = await import("drizzle-orm");
    const { db, schema } = await import("@/lib/server/db");
    const { deliverOrder } = await import("@/lib/server/orders-admin");
    const cutoff = new Date(Date.now() - 72 * 3600_000);
    const due = await db.select({ id: schema.orders.id }).from(schema.orders)
      .where(and(eq(schema.orders.status, "CONFIRMED"), lt(schema.orders.createdAt, cutoff))).limit(20);
    for (const o of due) await deliverOrder(o.id).catch(() => {});
  } catch {}
}

async function stats() {
  await runDueDeliveries();
  const q = async (x: string) => Number((await db.execute(sql.raw(x))).rows[0]?.v ?? 0);
  const rows = async (x: string) => (await db.execute(sql.raw(x))).rows as Record<string, unknown>[];

  const [
    pending, todayOrders, salesToday, salesWeek, lowStock, pendingReviews,
    newCustomersToday, viewsToday, viewsWeek, abandonedActive,
  ] = await Promise.all([
    q(`SELECT count(*) v FROM orders WHERE status='CONFIRMED'`),
    q(`SELECT count(*) v FROM orders WHERE created_at::date = now()::date AND status <> 'CANCELLED'`),
    q(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE created_at::date = now()::date AND status <> 'CANCELLED'`),
    q(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE created_at >= now() - interval '7 days' AND status <> 'CANCELLED'`),
    q(`SELECT count(*) v FROM (SELECT p.id FROM products p LEFT JOIN inventory_batches b ON b.product_id = p.id WHERE p.active GROUP BY p.id, p.stock_threshold HAVING COALESCE(SUM(b.qty_remaining),0) <= p.stock_threshold) x`),
    q(`SELECT count(*) v FROM reviews WHERE status='PENDING'`),
    q(`SELECT count(*) v FROM customers WHERE created_at::date = now()::date`),
    q(`SELECT count(*) v FROM page_views WHERE created_at::date = now()::date`).catch(() => 0),
    q(`SELECT count(*) v FROM page_views WHERE created_at >= now() - interval '7 days'`).catch(() => 0),
    q(`SELECT count(*) v FROM abandoned_carts WHERE recovered_at IS NULL AND created_at >= now() - interval '24 hours'`).catch(() => 0),
  ]);

  // آخر الطلبات المحتاجة إجراء
  const recentPending = await rows(`
    SELECT order_number, name, total, created_at
    FROM orders WHERE status='CONFIRMED'
    ORDER BY created_at DESC LIMIT 5
  `).catch(() => []);

  // تحويل اليوم (طلبات / زوار)
  const conv = viewsToday > 0 ? ((todayOrders / viewsToday) * 100) : 0;

  return {
    pending, todayOrders, salesToday, salesWeek, lowStock, pendingReviews,
    newCustomersToday, viewsToday, viewsWeek, abandonedActive,
    recentPending, conv,
  };
}

const sections = [
  { href: "/alikhazf25/orders/", label: "الطلبات", badge: "pending" as const },
  { href: "/alikhazf25/products/", label: "المنتجات" },
  { href: "/alikhazf25/inventory/", label: "المخزون", badge: "lowStock" as const },
  { href: "/alikhazf25/customers/", label: "العملاء" },
  { href: "/alikhazf25/analytics/", label: "التحليلات" },
  { href: "/alikhazf25/coupons/", label: "أكواد الخصم" },
  { href: "/alikhazf25/loyalty/", label: "الولاء والرحلة" },
  { href: "/alikhazf25/reviews/", label: "التقييمات", badge: "pendingReviews" as const },
  { href: "/alikhazf25/banners/", label: "البنرات" },
  { href: "/alikhazf25/settings/", label: "الإعدادات" },
];

export default async function AdminHome() {
  const s = await stats();
  const fmt = (n: number) => n.toLocaleString("en");
  const badge = (k?: "pending" | "lowStock" | "pendingReviews") => (k ? (s[k] as number) : 0);

  // بطاقات المهام اليومية — الأهم أولاً
  const cards = [
    { Icon: Clock, l: "بانتظار التوصيل", v: fmt(s.pending), warn: s.pending > 0, href: "/alikhazf25/orders/" },
    { Icon: ShoppingCart, l: "طلبات اليوم", v: fmt(s.todayOrders), sub: `${fmt(s.salesToday)} د.ع`, href: "/alikhazf25/orders/" },
    { Icon: Users, l: "عملاء جدد اليوم", v: fmt(s.newCustomersToday), href: "/alikhazf25/customers/" },
    { Icon: TrendingUp, l: "زوّار اليوم", v: fmt(s.viewsToday), sub: s.conv > 0 ? `تحويل ${s.conv.toFixed(1)}٪` : undefined, href: "/alikhazf25/analytics/" },
    { Icon: Wallet, l: "مبيعات الأسبوع", v: `${fmt(s.salesWeek)} د.ع`, href: "/alikhazf25/orders/" },
    { Icon: AlertTriangle, l: "مخزون منخفض", v: fmt(s.lowStock), warn: s.lowStock > 0, href: "/alikhazf25/inventory/" },
    { Icon: Star, l: "تقييمات بالانتظار", v: fmt(s.pendingReviews), warn: s.pendingReviews > 0, href: "/alikhazf25/reviews/" },
    { Icon: ShoppingCart, l: "سلات مهجورة (٢٤س)", v: fmt(s.abandonedActive), warn: s.abandonedActive > 0, href: "/alikhazf25/analytics/" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">لوحة خزف</h1>
      <p className="mt-1 text-[13px] text-muted">مهامك اليوم — نظرة سريعة على ما يحتاج انتباهك</p>

      {/* بطاقات المهام اليومية */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((x) => (
          <Link key={x.l} href={x.href}
            className={`rounded-[18px] border p-4 transition-all hover:-translate-y-0.5 active:scale-[0.98] ${x.warn ? "border-accent/40 bg-accent/5" : "border-line bg-card"}`}>
            <x.Icon size={17} className={x.warn ? "text-accent" : "text-muted"} />
            <p className="font-num mt-2.5 text-xl font-bold">{x.v}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">{x.l}{x.sub ? ` · ${x.sub}` : ""}</p>
          </Link>
        ))}
      </div>

      {/* أحدث الطلبات المحتاجة توصيل — إجراء مباشر */}
      {s.recentPending.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">بانتظار التوصيل الآن</h2>
            <Link href="/alikhazf25/orders/" className="text-[12px] font-semibold text-accent">كل الطلبات ←</Link>
          </div>
          <div className="space-y-2">
            {s.recentPending.map((o) => (
              <Link key={String(o.order_number)} href={`/alikhazf25/orders/?q=${o.order_number}`}
                className="flex items-center justify-between gap-3 rounded-[16px] border border-line bg-card px-5 py-3.5 transition-all hover:border-muted active:scale-[0.98]">
                <div className="min-w-0">
                  <p className="font-num text-[14px] font-bold">{String(o.order_number)}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted">{String(o.name)}</p>
                </div>
                <span className="font-num shrink-0 text-[13px] font-bold">{fmt(Number(o.total))} د.ع</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* روابط الأقسام — مضغوطة (مفيدة بالهاتف حيث تختفي القائمة الجانبية) */}
      <div className="mt-8">
        <h2 className="mb-3 text-[15px] font-bold">كل الأقسام</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {sections.map((sec) => {
            const b = badge(sec.badge);
            return (
              <Link key={sec.href} href={sec.href}
                className="relative flex items-center justify-center rounded-[14px] border border-line bg-card px-3 py-4 text-center text-[13px] font-bold transition-all hover:-translate-y-0.5 hover:border-muted active:scale-[0.98]">
                {sec.label}
                {b > 0 && (
                  <span className="font-num absolute -top-1.5 -left-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-olive-text">{b}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
