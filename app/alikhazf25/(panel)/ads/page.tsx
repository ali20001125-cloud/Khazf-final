/** الإعلانات — أداء Meta (صرف · نتائج · ROAS) داخل لوحتك، مع مقارنة بمبيعات المتجر. */
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { fetchMetaInsights } from "@/lib/server/meta";

export const dynamic = "force-dynamic";

const RANGES: [string, string, string][] = [
  ["today", "اليوم", "created_at::date = now()::date"],
  ["yesterday", "أمس", "created_at::date = (now() - interval '1 day')::date"],
  ["last_7d", "٧ أيام", "created_at >= now() - interval '7 days'"],
  ["last_30d", "٣٠ يوم", "created_at >= now() - interval '30 days'"],
];

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.find((r) => r[0] === sp.range) ? sp.range! : "last_7d";
  const rangeSql = RANGES.find((r) => r[0] === range)![2];

  const m = await fetchMetaInsights(range);
  const store = (await db.execute(sql`
    SELECT COALESCE(SUM(total),0)::int AS revenue, count(*)::int AS orders
    FROM orders WHERE is_test = false AND status <> 'CANCELLED' AND ${sql.raw(rangeSql)}`)).rows[0] as { revenue: number; orders: number };

  const fmt = (n: number, d = 0) => n.toLocaleString("en", { maximumFractionDigits: d });
  const cur = m.currency || "";

  return (
    <div className="max-w-3xl">
      <h1 className="text-[22px] font-bold">الإعلانات</h1>
      <p className="mt-1 text-[12.5px] text-muted">أداء إعلانات Meta داخل لوحتك — بلا فتح Ads Manager.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {RANGES.map(([k, label]) => (
          <Link key={k} href={`?range=${k}`}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${range === k ? "border-olive bg-olive text-olive-text" : "border-line bg-card text-muted hover:bg-bg-alt"}`}>
            {label}
          </Link>
        ))}
      </div>

      {!m.ok ? (
        <div className="mt-5 rounded-[8px] border border-accent/30 bg-accent/5 p-5 text-[13px] leading-relaxed">
          <p className="font-bold text-accent">تعذّر جلب بيانات Meta</p>
          <p className="mt-1.5 text-muted">{m.error}</p>
          <p className="mt-2 text-[12px] text-muted">تأكّد أن <span className="font-num" dir="ltr">META_ACCESS_TOKEN</span> و<span className="font-num" dir="ltr">META_AD_ACCOUNT_ID</span> مضبوطان في هوستنجر، وأن التوكن يملك إذن <span className="font-num" dir="ltr">ads_read</span>.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              ["الصرف", `${fmt(m.spend, 2)} ${cur}`, true],
              ["مشتريات (Meta)", fmt(m.purchases)],
              ["ROAS", m.roas ? `${fmt(m.roas, 2)}×` : "—", true],
              ["كلفة الشراء", m.costPerPurchase ? `${fmt(m.costPerPurchase, 2)} ${cur}` : "—"],
              ["مرّات الظهور", fmt(m.impressions)],
              ["النقرات", fmt(m.clicks)],
              ["نسبة النقر", `${fmt(m.ctr, 2)}٪`],
              ["كلفة النقرة", `${fmt(m.cpc, 2)} ${cur}`],
            ].map(([label, val, hi], i) => (
              <div key={i} className={`rounded-[8px] border p-3.5 ${hi ? "border-olive/40 bg-olive/5" : "border-line bg-card"}`}>
                <p className="font-num text-[18px] font-bold leading-none text-ink">{val as string}</p>
                <p className="mt-1.5 text-[10.5px] text-muted">{label as string}</p>
              </div>
            ))}
          </div>

          {/* مقارنة بمبيعات المتجر الفعلية */}
          <div className="mt-4 rounded-[8px] border border-line bg-card p-4">
            <p className="mb-2 text-[12px] font-bold text-muted">الإعلان مقابل مبيعات متجرك (نفس المدّة)</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <span>صرف الإعلان: <b className="font-num">{fmt(m.spend, 2)} {cur}</b></span>
              <span>مبيعات المتجر: <b className="font-num">{fmt(store.revenue)} د.ع</b></span>
              <span>طلبات المتجر: <b className="font-num">{fmt(store.orders)}</b></span>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              ROAS ومشتريات Meta تُحسب بعملة حسابك الإعلاني وبإسناد Meta (البكسل). مبيعات المتجر بالدينار من طلباتك الفعلية — قد تشمل مصادر غير الإعلان.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
