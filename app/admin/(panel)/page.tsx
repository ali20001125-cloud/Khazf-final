/** لوحة القيادة — أرقام حية + دخول مباشر لكل الأقسام */
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { Package, Wallet, AlertTriangle, Star } from "@/components/admin/Icons";

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
  const q = async (x: string) => Number((await db.execute(sql.raw(x))).rows[0].v ?? 0);
  return {
    pending: await q(`SELECT count(*) v FROM orders WHERE status='CONFIRMED'`),
    today: await q(`SELECT count(*) v FROM orders WHERE created_at::date = now()::date AND status <> 'CANCELLED'`),
    salesToday: await q(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE created_at::date = now()::date AND status <> 'CANCELLED'`),
    lowStock: await q(`
      SELECT count(*) v FROM (
        SELECT p.id FROM products p LEFT JOIN inventory_batches b ON b.product_id = p.id
        WHERE p.active GROUP BY p.id, p.stock_threshold
        HAVING COALESCE(SUM(b.qty_remaining),0) <= p.stock_threshold
      ) x`),
    pendingReviews: await q(`SELECT count(*) v FROM reviews WHERE status='PENDING'`),
  };
}

const sections = [
  { href: "/admin/orders/", label: "الطلبات", desc: "تأكيد ← توصيل · بحث وأرباح", badge: "pending" as const },
  { href: "/admin/products/", label: "المنتجات", desc: "أسعار · أوزان · أماكن الظهور" },
  { href: "/admin/inventory/", label: "المخزون والوجبات", desc: "+ وجبة · تعديل · سجل الحركات", badge: "lowStock" as const },
  { href: "/admin/customers/", label: "العملاء", desc: "ملفات · نقاط · ملاحظات" },
  { href: "/admin/coupons/", label: "أكواد الخصم", desc: "عامة أو موجّهة لزبون" },
  { href: "/admin/loyalty/", label: "الولاء والرحلة", desc: "المستويات الستة · هدايا البوكس" },
  { href: "/admin/reviews/", label: "التقييمات", desc: "موافقة · إخفاء · رد خزف", badge: "pendingReviews" as const },
  { href: "/admin/banners/", label: "البنرات", desc: "حملات الرئيسية" },
  { href: "/admin/settings/", label: "الإعدادات", desc: "توصيل · نقاط · بوكس · داخلي" },
];

export default async function AdminHome() {
  const s = await stats();
  const fmt = (n: number) => n.toLocaleString("en");
  const badge = (k?: "pending" | "lowStock" | "pendingReviews") => (k ? s[k] : 0);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold">لوحة خزف</h1>
      <p className="mt-1 text-[13px] text-muted">كل المتجر يُدار من هنا — اضغط أي قسم</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { Icon: Package, l: "بانتظار التوصيل", v: fmt(s.pending), warn: s.pending > 0 },
          { Icon: Wallet, l: "مبيعات اليوم", v: `${fmt(s.salesToday)} د.ع`, sub: `${fmt(s.today)} طلب` },
          { Icon: AlertTriangle, l: "مخزون منخفض", v: fmt(s.lowStock), warn: s.lowStock > 0 },
          { Icon: Star, l: "تقييمات بالانتظار", v: fmt(s.pendingReviews), warn: s.pendingReviews > 0 },
        ].map((x) => (
          <div key={x.l} className={`rounded-[18px] border p-4 ${x.warn ? "border-accent/40 bg-accent/5" : "border-line bg-card"}`}>
            <x.Icon size={17} className={x.warn ? "text-accent" : "text-muted"} />
            <p className="font-num mt-2.5 text-xl font-bold">{x.v}</p>
            <p className="mt-0.5 text-[11.5px] text-muted">{x.l}{"sub" in x && x.sub ? ` · ${x.sub}` : ""}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => {
          const b = badge(sec.badge);
          return (
            <Link key={sec.href} href={sec.href}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-line bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-muted active:scale-[0.98]">
              <span>
                <span className="block text-[15px] font-bold">{sec.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{sec.desc}</span>
              </span>
              {b > 0 && (
                <span className="font-num shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-olive-text">{b}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
