import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { PageTitle, Card, money, dateAr } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // ── الزوار ──
  const visits = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= now() - interval '1 day')::int AS views_24h,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 day')::int AS views_7d,
      COUNT(DISTINCT session_id) FILTER (WHERE created_at >= now() - interval '1 day')::int AS visitors_24h,
      COUNT(DISTINCT session_id) FILTER (WHERE created_at >= now() - interval '7 day')::int AS visitors_7d
    FROM page_views`)).rows[0] as unknown as
    { views_24h: number; views_7d: number; visitors_24h: number; visitors_7d: number };

  // أكثر الصفحات (٧ أيام)
  const topPages = (await db.execute(sql`
    SELECT path, COUNT(*)::int AS views
    FROM page_views WHERE created_at >= now() - interval '7 day'
    GROUP BY path ORDER BY views DESC LIMIT 8`)).rows as unknown as { path: string; views: number }[];

  // الأجهزة (٧ أيام)
  const devices = (await db.execute(sql`
    SELECT COALESCE(device,'?') AS device, COUNT(DISTINCT session_id)::int AS n
    FROM page_views WHERE created_at >= now() - interval '7 day'
    GROUP BY device ORDER BY n DESC`)).rows as unknown as { device: string; n: number }[];

  // ── الطلبات ومعدّل التحويل (٧ أيام) ──
  const orders7d = (await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM orders
    WHERE created_at >= now() - interval '7 day' AND status <> 'CANCELLED'`)).rows[0] as unknown as { n: number };
  const conv = visits.visitors_7d > 0 ? ((orders7d.n / visits.visitors_7d) * 100) : 0;

  // ── السلات المهجورة (لم تُسترد، آخر تحديث > ساعة) ──
  const abandoned = (await db.execute(sql`
    SELECT session_id, phone, name, items, items_total, updated_at
    FROM abandoned_carts
    WHERE recovered = false AND items_total > 0 AND updated_at < now() - interval '1 hour'
    ORDER BY updated_at DESC LIMIT 30`)).rows as unknown as
    { session_id: string; phone: string | null; name: string | null; items: { name: string; qty: number }[]; items_total: number; updated_at: string }[];

  const abandonStats = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour')::int AS open,
      COUNT(*) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour')::int AS total_open,
      COALESCE(SUM(items_total) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour'),0)::int AS lost_value
    FROM abandoned_carts`)).rows[0] as unknown as { open: number; lost_value: number };

  return (
    <div>
      <PageTitle title="التحليلات" sub="زوار الموقع والسلات المهجورة — لحظي من قاعدتك" />

      {/* بطاقات الزوار */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="زوار اليوم" value={visits.visitors_24h} sub={`${visits.views_24h} مشاهدة`} />
        <Stat label="زوار الأسبوع" value={visits.visitors_7d} sub={`${visits.views_7d} مشاهدة`} />
        <Stat label="طلبات الأسبوع" value={orders7d.n} sub="غير ملغاة" />
        <Stat label="معدّل التحويل" value={`${conv.toFixed(1)}٪`} sub="طلبات ÷ زوار" highlight />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* أكثر الصفحات */}
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-bold">أكثر الصفحات زيارة (٧ أيام)</h2>
          {topPages.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {topPages.map((p) => {
                const max = topPages[0].views || 1;
                return (
                  <div key={p.path} className="flex items-center gap-3">
                    <span className="font-num w-10 shrink-0 text-[13px] font-bold text-accent">{p.views}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span dir="ltr" className="truncate text-[12px] text-muted">{p.path}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-alt">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(p.views / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* الأجهزة */}
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-bold">الأجهزة (٧ أيام)</h2>
          {devices.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {devices.map((d) => {
                const total = devices.reduce((t, x) => t + x.n, 0) || 1;
                const label = d.device === "mobile" ? "جوال" : d.device === "desktop" ? "كمبيوتر" : d.device === "tablet" ? "لوحي" : "غير معروف";
                return (
                  <div key={d.device}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold">{label}</span>
                      <span className="font-num text-muted">{d.n} · {Math.round((d.n / total) * 100)}٪</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-alt">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${(d.n / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* السلات المهجورة */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">السلات المهجورة</h2>
          {abandonStats.lost_value > 0 && (
            <span className="font-num rounded-full bg-accent/10 px-3 py-1 text-[12px] font-bold text-accent">
              قيمة معلّقة: {money(abandonStats.lost_value)}
            </span>
          )}
        </div>
        {abandoned.length === 0 ? (
          <Card className="p-8 text-center text-[13px] text-muted">لا سلات مهجورة — ممتاز</Card>
        ) : (
          <div className="space-y-2.5">
            {abandoned.map((a) => (
              <Card key={a.session_id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold">
                    {a.name || "زائر"} {a.phone && <span className="font-num text-muted">· {a.phone}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {(a.items ?? []).map((i) => `${i.name}×${i.qty}`).join(" · ")}
                  </p>
                  <p className="font-num mt-0.5 text-[11px] text-muted">{dateAr(a.updated_at)}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="font-num text-[15px] font-bold text-accent">{money(a.items_total)}</p>
                  {a.phone && (
                    <a href={`https://wa.me/964${a.phone.replace(/^0/, "")}`} target="_blank" rel="noopener"
                      className="mt-1 inline-block rounded-full border border-line px-3 py-1 text-[11px] font-bold text-olive">
                      تذكير واتساب
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        للتحليلات الاحترافية للزوار والإعلانات: <Link href="/admin/settings/" className="font-bold text-accent">Google Analytics و Meta Pixel</Link> مفعّلان من الإعدادات.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[16px] border p-4 ${highlight ? "border-accent/30 bg-accent/[0.05]" : "border-line bg-card"}`}>
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`font-num mt-1 text-2xl font-bold ${highlight ? "text-accent" : ""}`}>{value}</p>
      {sub && <p className="font-num mt-0.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function Empty() {
  return <p className="py-6 text-center text-[13px] text-muted">لا بيانات بعد — ستظهر مع أول الزيارات</p>;
}
