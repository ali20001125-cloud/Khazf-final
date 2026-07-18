/** لوحة القيادة — أرقام حية (الأقسام الكاملة = الدفعة ٣) */
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { getAdmin } from "@/lib/server/admin-auth";
import { Package, Wallet, AlertTriangle, Star, LogOutIcon } from "@/components/admin/Icons";

export const dynamic = "force-dynamic";

async function stats() {
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
  "الطلبات", "المنتجات", "المخزون والوجبات", "العملاء", "الأكواد",
  "الولاء والرحلة", "التقييمات", "البنرات", "الإعدادات",
];

export default async function AdminHome() {
  const admin = await getAdmin();
  const s = await stats();
  const fmt = (n: number) => n.toLocaleString("en");
  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة خزف</h1>
          <p className="mt-1 text-[13px] text-muted">أهلاً {admin?.name}</p>
        </div>
        <form action="/api/admin/logout/" method="post">
          <button className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-accent">
            <LogOutIcon size={15} /> خروج
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { Icon: Package, l: "بانتظار التوصيل", v: fmt(s.pending), warn: s.pending > 0 },
          { Icon: Wallet, l: "مبيعات اليوم", v: `${fmt(s.salesToday)} د.ع`, sub: `${fmt(s.today)} طلب` },
          { Icon: AlertTriangle, l: "مخزون منخفض", v: fmt(s.lowStock), warn: s.lowStock > 0 },
          { Icon: Star, l: "تقييمات بالانتظار", v: fmt(s.pendingReviews), warn: s.pendingReviews > 0 },
        ].map((x) => (
          <div key={x.l} className={`rounded-[18px] border p-5 ${x.warn ? "border-accent/40 bg-accent/5" : "border-line bg-card"}`}>
            <x.Icon size={18} className={x.warn ? "text-accent" : "text-muted"} />
            <p className="font-num mt-3 text-2xl font-bold">{x.v}</p>
            <p className="mt-0.5 text-[12px] text-muted">{x.l}{"sub" in x && x.sub ? ` · ${x.sub}` : ""}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">الأقسام</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {sections.map((name) => (
          <div key={name} className="rounded-[16px] border border-dashed border-line px-5 py-4 text-[13.5px] font-bold text-muted">
            {name} <span className="ms-1 text-[10px] font-semibold">— الدفعة ٣</span>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-[14px] bg-bg-alt px-5 py-3.5 text-[12px] leading-relaxed text-muted">
        كل الأرقام أعلاه حية من قاعدة البيانات · الأقسام التفصيلية (إدارة كاملة لكل شيء) تُبنى في الدفعة الثالثة
      </p>
      <Link href="/" className="mt-4 inline-block text-[13px] font-bold text-accent">← رجوع للمتجر</Link>
    </div>
  );
}
