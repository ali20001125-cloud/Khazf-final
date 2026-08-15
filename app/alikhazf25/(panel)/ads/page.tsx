/** الإعلانات — أداء Meta + عائد المتجر (بالدينار) + الأعمار/الجنس/المناطق. */
import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { fetchMetaInsights, fetchMetaBreakdown, fetchMetaCampaigns, USD_TO_IQD, type DateArg, type BreakRow } from "@/lib/server/meta";
import PrintButton from "@/components/PrintButton";
import CampaignSelect from "@/components/admin/CampaignSelect";

export const dynamic = "force-dynamic";

const PRESETS: [string, string][] = [["today", "اليوم"], ["yesterday", "أمس"], ["last_7d", "٧ أيام"], ["last_30d", "٣٠ يوم"]];

export default async function AdsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; campaign?: string }> }) {
  const sp = await searchParams;
  const custom = sp.from && sp.to;
  const hasPreset = !custom && !!PRESETS.find((r) => r[0] === sp.range);
  const todayStr = new Date().toISOString().slice(0, 10);
  const campaign = sp.campaign?.trim() || "";
  const campaigns = await fetchMetaCampaigns();
  const selected = campaigns.find((c) => c.id === campaign);

  /* وضع تلقائي: حملة مختارة بلا اختيار تاريخ → من بداية الحملة لنهايتها (أو لليوم) */
  const auto = !!campaign && !custom && !hasPreset && !!selected?.start;
  const autoFrom = auto ? selected!.start! : "";
  const autoTo = auto ? (selected!.stop && selected!.stop! < todayStr ? selected!.stop! : todayStr) : "";
  const range = hasPreset ? sp.range! : (custom || auto ? "" : "last_7d");

  const dateArg: DateArg =
    custom ? { since: sp.from!, until: sp.to! }
    : auto ? { since: autoFrom, until: autoTo }
    : { preset: range || "last_7d" };

  // نطاق SQL لمبيعات المتجر بنفس المدّة
  const rangeSql = custom
    ? sql`created_at::date >= ${sp.from} AND created_at::date <= ${sp.to}`
    : auto ? sql`created_at::date >= ${autoFrom} AND created_at::date <= ${autoTo}`
    : range === "today" ? sql`created_at::date = now()::date`
    : range === "yesterday" ? sql`created_at::date = (now() - interval '1 day')::date`
    : range === "last_30d" ? sql`created_at >= now() - interval '30 days'`
    : sql`created_at >= now() - interval '7 days'`;

  const node = campaign || undefined;
  const [m, ageGender, region] = await Promise.all([
    fetchMetaInsights(dateArg, node),
    fetchMetaBreakdown(dateArg, "age,gender", node),
    fetchMetaBreakdown(dateArg, "region", node),
  ]);
  /* مبيعات الإعلان: حملة مختارة → مطابقة utm_id · كل الحملات → مصدر إنستقرام/فيسبوك */
  const attr = campaign
    ? sql`pv.path ~ ${`utm_id=${campaign}(&|$)`}`
    : sql`(pv.referrer ILIKE '%instagram%' OR pv.referrer ILIKE '%facebook%'
        OR pv.path ILIKE '%utm_source=instagram%' OR pv.path ILIKE '%utm_source=facebook%')`;
  const store = (await db.execute(sql`
    WITH meta_phones AS (
      SELECT DISTINCT ac.phone FROM abandoned_carts ac
      JOIN page_views pv ON pv.session_id = ac.session_id
      WHERE ac.phone IS NOT NULL AND ${attr}
    )
    SELECT COALESCE(SUM(total),0)::int AS revenue, count(*)::int AS orders
    FROM orders WHERE is_test = false AND status <> 'CANCELLED' AND ${rangeSql}
      AND customer_phone IN (SELECT phone FROM meta_phones)`)).rows[0] as { revenue: number; orders: number };

  const fmt = (n: number, d = 0) => n.toLocaleString("en", { maximumFractionDigits: d });
  const cur = m.currency || "";
  const isUsd = cur === "USD";
  const spendIqd = isUsd ? m.spend * USD_TO_IQD : m.spend;             // تقدير الصرف بالدينار
  const storeRoas = spendIqd > 0 ? store.revenue / spendIqd : 0;       // عائد المتجر الحقيقي

  const presetLink = (k: string) => `?range=${k}${campaign ? `&campaign=${encodeURIComponent(campaign)}` : ""}`;
  const allCampaignsLink = `?range=${range || "last_7d"}`;
  const dateLabel = custom ? `${sp.from} ← ${sp.to}` : auto ? `${autoFrom} ← ${autoTo}` : "";

  const BreakCard = ({ title, data, err }: { title: string; data: BreakRow[]; err?: string }) => {
    const top = [...data].sort((a, b) => b.clicks - a.clicks).slice(0, 8);
    const max = Math.max(1, ...top.map((r) => r.clicks));
    if (err || top.length === 0) return null;
    return (
      <div className="rounded-[8px] border border-line bg-card p-4">
        <p className="mb-1 text-[12px] font-bold text-muted">{title}</p>
        <p className="mb-3 text-[10px] text-muted">عدد من ضغطوا إعلانك من كل فئة</p>
        <div className="space-y-1.5">
          {top.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[11.5px] text-ink">{r.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-[3px] bg-bg-alt">
                <div className="h-full bg-accent" style={{ width: `${Math.max((r.clicks / max) * 100, 4)}%` }} />
              </div>
              <span className="font-num w-24 shrink-0 text-end text-[10.5px] text-muted">
                {fmt(r.clicks)} نقرة{r.purchases > 0 ? ` · ${r.purchases} شراء` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const exportUrl = `/api/admin/export/?type=ads${custom ? `&from=${sp.from}&to=${sp.to}` : auto ? `&from=${autoFrom}&to=${autoTo}` : `&range=${range}`}${campaign ? `&campaign=${campaign}` : ""}`;

  // أداء Meta (يشتغل دائماً) + عائد متجرك بالدينار (يظهر عند ربط UTM)
  const kpis: [string, string, boolean?][] = [
    ["الصرف", `${fmt(m.spend, 2)} ${cur}`],
    ["عائد Meta (ROAS)", m.roas ? `${fmt(m.roas, 2)}×` : "—", true],
    ["مشتريات Meta", fmt(m.purchases), true],
    ["مبيعات المتجر (دينار)", store.revenue ? `${fmt(store.revenue)} د.ع` : "—"],
    ["عائد المتجر بالدينار", storeRoas ? `${fmt(storeRoas, 2)}×` : "—"],
    ["نسبة النقر", `${fmt(m.ctr, 2)}٪`],
    ["النقرات", fmt(m.clicks)],
    ["كلفة النقرة", `${fmt(m.cpc, 2)} ${cur}`],
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">الإعلانات</h1>
          <p className="mt-1 text-[12.5px] text-muted">أداء Meta + مبيعات الإعلان الفعلية — بلا فتح Ads Manager.</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <a href={exportUrl} download className="text-[12.5px] font-bold text-olive">⬇ CSV</a>
          <PrintButton label="🖨️ PDF" className="text-[12.5px] font-bold text-accent" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PRESETS.map(([k, label]) => (
          <Link key={k} href={presetLink(k)}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${!custom && range === k ? "border-olive bg-olive text-olive-text" : "border-line bg-card text-muted hover:bg-bg-alt"}`}>
            {label}
          </Link>
        ))}
        <span className="ms-auto"><CampaignSelect campaigns={campaigns} value={campaign} /></span>
      </div>
      {campaign && (
        <p className="mt-2 text-[11.5px] text-accent">
          تعرض حملة واحدة
          {auto && <> · <span className="font-num" dir="ltr">{dateLabel}</span> <span className="text-muted">(مدّة الحملة تلقائياً)</span></>}
          {" "}· <Link href={allCampaignsLink} className="font-bold underline">كل الحملات</Link>
        </p>
      )}
      <form className="mt-2.5 flex flex-wrap items-end gap-2.5 rounded-[8px] border border-line bg-card p-3">
        {campaign && <input type="hidden" name="campaign" value={campaign} />}
        <label className="text-[11px] font-semibold text-muted">من
          <input type="date" name="from" max={todayStr} defaultValue={sp.from ?? ""} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-1.5 text-[13px]" /></label>
        <label className="text-[11px] font-semibold text-muted">إلى
          <input type="date" name="to" max={todayStr} defaultValue={sp.to ?? ""} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-1.5 text-[13px]" /></label>
        <button className="rounded-[5px] bg-olive px-4 py-2 text-[12.5px] font-bold text-olive-text">تاريخ مخصّص</button>
      </form>

      {!m.ok ? (
        <div className="mt-5 rounded-[8px] border border-accent/30 bg-accent/5 p-5 text-[13px] leading-relaxed">
          <p className="font-bold text-accent">تعذّر جلب بيانات Meta</p>
          <p className="mt-1.5 text-muted">{m.error}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {kpis.map(([label, val, hi], i) => (
              <div key={i} className={`rounded-[8px] border p-3.5 ${hi ? "border-olive/40 bg-olive/5" : "border-line bg-card"}`}>
                <p className="font-num text-[18px] font-bold leading-none text-ink">{val as string}</p>
                <p className="mt-1.5 text-[10.5px] text-muted">{label as string}</p>
              </div>
            ))}
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
            «عائد Meta» من بكسل ميتا ويشتغل دائماً. «عائد المتجر بالدينار» = مبيعاتك الحقيقية ÷ الصرف بالدينار{isUsd && <> (بسعر <b className="font-num">{fmt(USD_TO_IQD)}</b> د/دولار)</>}،
            {campaign ? " ويظهر بعد ربط UTM بإعلان الحملة." : " من زبائن جاؤوا من إنستقرام/فيسبوك."}
          </p>{" "}
          {campaign && store.orders === 0 && (
            <p className="mt-2 rounded-[6px] border border-accent/25 bg-accent/5 p-2.5 text-[11px] leading-relaxed text-muted">
              لم تُنسب مبيعات لهذي الحملة بعد. لتفعيل النسب الدقيق: في مدير إعلانات Meta ← إعداد الرابط ← «مُعامِلات URL»، أضِف:
              <span className="font-num mt-1 block select-all rounded bg-bg-alt px-2 py-1 text-[10.5px]" dir="ltr">utm_source=facebook&utm_medium=paid&utm_campaign=&#123;&#123;campaign.name&#125;&#125;&utm_id=&#123;&#123;campaign.id&#125;&#125;</span>
              بعدها تُنسب كل مبيعة تلقائياً للحملة الصحيحة.
            </p>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <BreakCard title="حسب العمر والجنس" data={ageGender.rows} err={ageGender.error} />
            <BreakCard title="حسب المنطقة" data={region.rows} err={region.error} />
          </div>
          {(ageGender.rows.length === 0 && region.rows.length === 0) && (
            <p className="mt-3 text-[11.5px] text-muted">التفصيل الديموغرافي يظهر عند توفّر بيانات كافية بهذي المدّة.</p>
          )}
        </>
      )}
    </div>
  );
}
