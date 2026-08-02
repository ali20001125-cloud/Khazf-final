import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money, dateAr } from "@/components/admin/ui";

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
    SELECT session_id, phone, name, email, template_sent, items, items_total, updated_at
    FROM abandoned_carts WHERE (email IS NULL OR lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')) AND (phone IS NULL OR phone NOT IN (SELECT value FROM test_identities WHERE kind='phone'))
    WHERE recovered = false AND items_total > 0 AND updated_at < now() - interval '1 hour'
    ORDER BY updated_at DESC LIMIT 30`)).rows as unknown as
    { session_id: string; phone: string | null; name: string | null; email: string | null; template_sent: string | null; items: { name: string; qty: number }[]; items_total: number; updated_at: string }[];

  const abandonStats = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour')::int AS open,
      COUNT(*) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour')::int AS total_open,
      COALESCE(SUM(items_total) FILTER (WHERE recovered = false AND updated_at < now() - interval '1 hour'),0)::int AS lost_value
    FROM abandoned_carts WHERE (email IS NULL OR lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')) AND (phone IS NULL OR phone NOT IN (SELECT value FROM test_identities WHERE kind='phone'))`)).rows[0] as unknown as { open: number; lost_value: number };

  // ── إحصائيات تذكير السلة ──
  const reminderStats = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE notified = true)::int AS sent,
      COUNT(*) FILTER (WHERE notified = true AND recovered = true)::int AS recovered_after,
      COUNT(*) FILTER (WHERE notified = true AND template_sent = '1')::int AS t1,
      COUNT(*) FILTER (WHERE notified = true AND template_sent = '2')::int AS t2,
      COUNT(*) FILTER (WHERE notified = true AND template_sent = '3')::int AS t3
    FROM abandoned_carts WHERE (email IS NULL OR lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')) AND (phone IS NULL OR phone NOT IN (SELECT value FROM test_identities WHERE kind='phone'))`)).rows[0] as unknown as
    { sent: number; recovered_after: number; t1: number; t2: number; t3: number };
  const recoveryRate = reminderStats.sent > 0
    ? ((reminderStats.recovered_after / reminderStats.sent) * 100).toFixed(0) : "0";

  /* هويات الاختبار — تُستثنى من كل الأرقام */
  const NOT_TEST_EMAIL = sql`lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')`;

  // ── قائمة البريد (من ترك بريده بلا شراء) ──
  let leads = { total: 0, guide: 0, restock: 0, week: 0, converted: 0 };
  let leadRows: { email: string; source: string; product_slug: string | null; notified: boolean; created_at: string }[] = [];
  try {
    leads = (await db.execute(sql`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE source='guide')::int AS guide,
        COUNT(*) FILTER (WHERE source='restock')::int AS restock,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM customers c WHERE lower(c.email) = lower(email_leads.email)))::int AS converted
      FROM email_leads WHERE ${NOT_TEST_EMAIL}`)).rows[0] as unknown as typeof leads;
    leadRows = (await db.execute(sql`
      SELECT email, source, product_slug, notified, created_at::text
      FROM email_leads WHERE ${NOT_TEST_EMAIL} ORDER BY created_at DESC LIMIT 200`)).rows as unknown as typeof leadRows;
  } catch { /* الجدول قد لا يكون منشأً */ }

  // ── سجل الإيميلات (مراقبة حد ١٠٠/يوم) ──
  let mail = { today: 0, week: 0, welcome: 0, order_confirm: 0, admin_order: 0, review: 0, cart: 0, failed: 0 };
  try {
    mail = (await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS today,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week,
        COUNT(*) FILTER (WHERE kind='welcome' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS welcome,
        COUNT(*) FILTER (WHERE kind='order_confirm' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS order_confirm,
        COUNT(*) FILTER (WHERE kind='admin_order' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS admin_order,
        COUNT(*) FILTER (WHERE kind='review' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS review,
        COUNT(*) FILTER (WHERE kind LIKE 'cart_%' AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad')::int AS cart,
        COUNT(*) FILTER (WHERE ok = false AND created_at >= now() - interval '7 days')::int AS failed
      FROM email_log WHERE recipient IS NULL OR lower(recipient) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')`)).rows[0] as unknown as typeof mail;
  } catch { /* الجدول قد لا يكون منشأً بعد */ }

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

      {/* أدوات الاختبار */}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[14px] border border-line bg-bg-alt px-4 py-3">
        <p className="text-[12.5px] text-muted">
          هذه الأرقام تستثني زياراتك وحساباتك وأرقامك.
        </p>
        <a href="/no-track/" target="_blank" rel="noopener"
          className="text-[12.5px] font-bold text-accent">استثنِ هذا الجهاز ←</a>
      </div>

      {/* قائمة البريد */}
      {leads.total > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-[15px] font-bold">قائمة البريد <span className="text-[12px] font-normal text-muted">— تركوا بريدهم بلا شراء</span></h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-[11px] text-muted">الإجمالي</p><p className="font-num mt-1 text-2xl font-bold">{leads.total}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">آخر ٧ أيام</p><p className="font-num mt-1 text-2xl font-bold text-gold">{leads.week}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">دليل التحضير</p><p className="font-num mt-1 text-2xl font-bold">{leads.guide}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">صاروا زبائن</p><p className="font-num mt-1 text-2xl font-bold text-ok">{leads.converted}</p></Card>
          </div>
          <details className="mt-3 rounded-[18px] border border-line bg-card">
            <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-bold text-muted">
              عرض القائمة ({leadRows.length}) — انسخها لحملاتك
            </summary>
            <div className="border-t border-line p-4">
              <textarea readOnly rows={5} dir="ltr"
                className="font-num w-full rounded-[12px] border border-line bg-bg p-3 text-[12px] outline-none"
                value={leadRows.map((l) => l.email).join(", ")} />
              <p className="mt-2 text-[11.5px] text-muted">اضغط داخل الصندوق ثم حدّد الكل وانسخ.</p>
              <div className="mt-3 max-h-64 overflow-y-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="border-b border-line">
                    <tr><Th>البريد</Th><Th>المصدر</Th><Th>الحالة</Th><Th>التاريخ</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {leadRows.map((l, i) => (
                      <tr key={l.email + i} className="hover:bg-bg-alt/50">
                        <Td><span className="font-num text-[12.5px]" dir="ltr">{l.email}</span></Td>
                        <Td className="text-[12px]">{l.source === "restock" ? `تنبيه: ${l.product_slug ?? "—"}` : "دليل التحضير"}</Td>
                        <Td className="text-[12px]">{l.source === "restock" ? (l.notified ? "أُشعر" : "بانتظار التوفّر") : "أُرسل الدليل"}</Td>
                        <Td className="font-num text-[11.5px] text-muted">{dateAr(l.created_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* سجل الإيميلات — مراقبة حد ١٠٠/يوم */}
      <div className="mt-6">
        <h2 className="mb-3 text-[15px] font-bold">
          البريد المرسل اليوم
          <span className={`ms-2 text-[12px] font-bold ${mail.today >= 90 ? "text-accent" : mail.today >= 70 ? "text-gold" : "text-muted"}`}>
            {mail.today} / 100
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="p-4">
            <p className="text-[11px] text-muted">اليوم</p>
            <p className={`font-num mt-1 text-2xl font-bold ${mail.today >= 90 ? "text-accent" : ""}`}>{mail.today}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-alt">
              <div className={`h-full rounded-full ${mail.today >= 90 ? "bg-accent" : mail.today >= 70 ? "bg-gold" : "bg-ok"}`}
                style={{ width: `${Math.min(100, mail.today)}%` }} />
            </div>
          </Card>
          <Card className="p-4"><p className="text-[11px] text-muted">تأكيد طلب</p><p className="font-num mt-1 text-2xl font-bold">{mail.order_confirm}</p></Card>
          <Card className="p-4"><p className="text-[11px] text-muted">تذكير سلة</p><p className="font-num mt-1 text-2xl font-bold">{mail.cart}</p></Card>
          <Card className="p-4"><p className="text-[11px] text-muted">ترحيب</p><p className="font-num mt-1 text-2xl font-bold">{mail.welcome}</p></Card>
          <Card className="p-4"><p className="text-[11px] text-muted">تقييم</p><p className="font-num mt-1 text-2xl font-bold">{mail.review}</p></Card>
        </div>
        {mail.today >= 80 && (
          <p className="mt-2 rounded-[10px] bg-accent/8 px-3 py-2 text-[12px] font-bold text-accent">
            اقتربت من حد البريد اليومي (١٠٠) — فكّر برفع خطة البريد
          </p>
        )}
        {mail.failed > 0 && (
          <p className="mt-2 text-[11.5px] text-muted">فشل إرسال {mail.failed} خلال ٧ أيام</p>
        )}
      </div>

      {/* إحصائيات تذكير السلة */}
      {reminderStats.sent > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-[15px] font-bold">تذكيرات السلة المرسلة</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-[11px] text-muted">أُرسلت</p>
              <p className="font-num mt-1 text-2xl font-bold">{reminderStats.sent}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-muted">رجعوا واشتروا</p>
              <p className="font-num mt-1 text-2xl font-bold text-ok">{reminderStats.recovered_after}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-muted">نسبة الاسترجاع</p>
              <p className="font-num mt-1 text-2xl font-bold text-gold">{recoveryRate}٪</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-muted">توزيع القوالب</p>
              <p className="font-num mt-1 text-[13px] font-bold">
                ①{reminderStats.t1} · ②{reminderStats.t2} · ③{reminderStats.t3}
              </p>
            </Card>
          </div>
        </div>
      )}

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
            {abandoned.map((a) => {
              const sentLabel = a.template_sent === "wa" ? "أُشعرت للواتساب"
                : a.template_sent ? `أُرسل إيميل (قالب ${a.template_sent})`
                : null;
              return (
              <Card key={a.session_id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold">
                    {a.name || "زائر"} {a.phone && <span className="font-num text-muted">· {a.phone}</span>}
                  </p>
                  {a.email && <p className="font-num mt-0.5 truncate text-[11.5px] text-muted" dir="ltr">{a.email}</p>}
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {(a.items ?? []).map((i) => `${i.name}×${i.qty}`).join(" · ")}
                  </p>
                  <p className="font-num mt-0.5 text-[11px] text-muted">{dateAr(a.updated_at)}</p>
                  {sentLabel
                    ? <p className="mt-1 inline-block rounded-full bg-ok/10 px-2.5 py-0.5 text-[10.5px] font-bold text-ok">{sentLabel}</p>
                    : <p className="mt-1 inline-block rounded-full bg-bg-alt px-2.5 py-0.5 text-[10.5px] font-bold text-muted">
                        {a.email ? "بانتظار الإيميل التلقائي" : a.phone ? "بانتظار إشعار الواتساب" : "بلا وسيلة تواصل"}
                      </p>}
                </div>
                <div className="shrink-0 text-end">
                  <p className="font-num text-[15px] font-bold text-accent">{money(a.items_total)}</p>
                  {a.phone && (
                    <a href={`https://wa.me/964${a.phone.replace(/^0/, "")}`} target="_blank" rel="noopener"
                      className="mt-1 inline-block rounded-full border border-line px-3 py-1 text-[11px] font-bold text-olive">
                      مراسلة يدوية
                    </a>
                  )}
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        للتحليلات الاحترافية للزوار والإعلانات: <Link href="/alikhazf25/settings/" className="font-bold text-accent">Google Analytics و Meta Pixel</Link> مفعّلان من الإعدادات.
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
