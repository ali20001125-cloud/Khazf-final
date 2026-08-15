/**
 * رحلات الزوّار — تحليلات احترافية من بيانات المتجر:
 * زوّار فريدون · عائدون · قمع تحويل (على كل النطاق) · مصدر · مسار · شراء ضمن الزيارة.
 * اختصارات تاريخ · فلترة القصيرة بالقاعدة · بطاقات درِل-داون.
 */
import Link from "next/link";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
const LIMIT = 800;

function fmtDur(sec: number | null): string {
  if (sec == null || sec < 0) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s} ث`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}:${String(r).padStart(2, "0")} د` : `${m} د`;
}
function splitPath(full: string) {
  const i = full.indexOf("?");
  return i < 0 ? { pathname: full, query: "" } : { pathname: full.slice(0, i), query: full.slice(i + 1) };
}
function param(query: string, key: string): string | null {
  for (const kv of query.split("&")) {
    const [k, v] = kv.split("=");
    if (k === key && v) return decodeURIComponent(v.replace(/\+/g, " "));
  }
  return null;
}
function sourceLabel(referrer: string | null, landing: string): string {
  const utm = param(splitPath(landing).query, "utm_source");
  const raw = (utm || referrer || "").toLowerCase();
  if (!raw) return "مباشر";
  if (raw.includes("instagram") || raw.includes("ig")) return "Instagram";
  if (raw.includes("facebook") || raw.includes("fb")) return "Facebook";
  if (raw.includes("google")) return "Google";
  if (raw.includes("tiktok")) return "TikTok";
  if (raw.includes("t.co") || raw.includes("twitter")) return "X";
  if (raw.includes("khazf")) return "داخل الموقع";
  try { return new URL(referrer!).hostname.replace(/^www\./, ""); } catch { return utm || "أخرى"; }
}
const srcDot = (s: string) =>
  s === "Instagram" ? "#c13584" : s === "Facebook" ? "#1877f2" : s === "Google" ? "#0f9d58"
  : s === "TikTok" ? "#111" : s === "مباشر" ? "#9a8f80" : "#a66a4c";

type Row = Record<string, unknown>;

export default async function JourneysPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; phone?: string; all?: string }> }) {
  const sp = await searchParams;
  const todayStr = new Date().toISOString().slice(0, 10);
  const toDate = sp.to ? new Date(sp.to + "T23:59:59.999Z") : new Date();
  const fromDate = sp.from ? new Date(sp.from + "T00:00:00.000Z") : new Date(Date.now() - 7 * 86400_000);
  const fromISO = fromDate.toISOString(), toISO = toDate.toISOString();
  const dateVal = (d: Date) => d.toISOString().slice(0, 10);
  const phoneFilter = sp.phone?.trim() || null;
  const showAll = sp.all === "1";
  const engagedOnly = !showAll && !phoneFilter;
  const engagedHaving = sql`HAVING count(*) >= 2 OR EXTRACT(EPOCH FROM (max(created_at)-min(created_at))) >= 5`;

  const prods = (await db.execute(sql`SELECT slug, name FROM products`)).rows as Row[];
  const prodName = new Map(prods.map((p) => [String(p.slug), String(p.name)]));
  const pageLabel = (full: string): string => {
    const { pathname, query } = splitPath(full);
    const p = pathname.replace(/\/+$/, "") || "/";
    if (p === "/product") { const c = param(query, "c") || param(query, "t"); return c ? (prodName.get(c) || c) : "منتج"; }
    const map: Record<string, string> = {
      "/": "الرئيسية", "/products": "المنتجات", "/box": "البوكس", "/cart": "السلة", "/checkout": "الدفع",
      "/account": "حسابي", "/offers": "العروض", "/start": "ابدأ", "/recipes": "الوصفات", "/journal": "المدوّنة",
      "/about": "عن خزف", "/contact": "تواصل", "/faq": "الأسئلة", "/shipping": "الشحن", "/returns": "الاستبدال",
      "/login": "الدخول", "/track": "تتبّع الطلب", "/guide": "دليل التحضير",
    };
    return map[p] ?? p;
  };

  /* مؤشرات كليّة على كل النطاق (لا المعروض فقط) */
  const totals = (await db.execute(sql`
    SELECT count(DISTINCT session_id)::int AS sessions,
      count(DISTINCT COALESCE(visitor_id, session_id))::int AS visitors,
      (SELECT count(*)::int FROM customers WHERE created_at >= ${fromISO} AND created_at <= ${toISO} AND phone NOT LIKE 'auth:%') AS new_customers
    FROM page_views WHERE created_at >= ${fromISO} AND created_at <= ${toISO}`)).rows[0] as Row;
  const returning = ((await db.execute(sql`
    SELECT count(*)::int n FROM (
      SELECT DISTINCT visitor_id FROM page_views
      WHERE created_at >= ${fromISO} AND created_at <= ${toISO} AND visitor_id IS NOT NULL
    ) v WHERE EXISTS (SELECT 1 FROM page_views p WHERE p.visitor_id = v.visitor_id AND p.created_at < ${fromISO})`)).rows[0] as Row).n as number;

  /* قمع التحويل — على كل جلسات النطاق (دقيق حتى لو البطاقات محدودة) */
  const fn = (await db.execute(sql`
    WITH sess AS (
      SELECT session_id, min(created_at) started, max(created_at) ended,
        bool_or(path LIKE '/product%') product, bool_or(path LIKE '/checkout%') checkout
      FROM page_views WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
      GROUP BY session_id ${engagedOnly ? engagedHaving : sql``}
    ), enr AS (
      SELECT s.*, ac.phone cart_phone,
        EXISTS (SELECT 1 FROM orders o WHERE o.customer_phone = ac.phone AND o.status <> 'CANCELLED'
                AND o.created_at >= s.started AND o.created_at <= s.ended + interval '2 hours') bought
      FROM sess s LEFT JOIN abandoned_carts ac ON ac.session_id = s.session_id
    )
    SELECT count(*)::int visits,
      count(*) FILTER (WHERE product)::int product,
      count(*) FILTER (WHERE cart_phone IS NOT NULL)::int cart,
      count(*) FILTER (WHERE checkout)::int checkout,
      count(*) FILTER (WHERE bought)::int bought,
      COALESCE(round(AVG(EXTRACT(EPOCH FROM (ended-started)))),0)::int avg_sec
    FROM enr`)).rows[0] as Row;
  const funnel = { visits: fn.visits as number, product: fn.product as number, cart: fn.cart as number, checkout: fn.checkout as number, bought: fn.bought as number };
  const avgSec = fn.avg_sec as number;
  const pct = (n: number) => (funnel.visits ? Math.round((n / funnel.visits) * 100) : 0);

  /* الجلسات (للبطاقات) */
  const sessRows = (await db.execute(sql`
    SELECT session_id,
      min(created_at) AS started, max(created_at) AS ended, count(*)::int AS pages,
      (array_agg(referrer ORDER BY created_at) FILTER (WHERE referrer IS NOT NULL AND referrer <> ''))[1] AS referrer,
      (array_agg(device ORDER BY created_at))[1] AS device,
      (array_agg(visitor_id ORDER BY created_at) FILTER (WHERE visitor_id IS NOT NULL))[1] AS visitor_id,
      (array_agg(path ORDER BY created_at))[1] AS landing,
      (array_agg(path ORDER BY created_at DESC))[1] AS exit_path,
      bool_or(path LIKE '/checkout%') AS reached_checkout,
      bool_or(path LIKE '/product%') AS saw_product
    FROM page_views
    WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
    GROUP BY session_id ${engagedOnly ? engagedHaving : sql``}
    ORDER BY started DESC LIMIT ${LIMIT}`)).rows as Row[];

  const ids = sessRows.map((r) => r.session_id as string);
  const trailBy: Record<string, { path: string; created_at: string }[]> = {};
  const cartBy: Record<string, { phone: string | null }> = {};
  const nameByPhone: Record<string, string> = {};
  const orderTimesByPhone: Record<string, number[]> = {};
  const firstSeenByVisitor: Record<string, number> = {};

  if (ids.length) {
    const idList = sql.join(ids.map((x) => sql`${x}`), sql`, `);
    const trail = (await db.execute(sql`
      SELECT session_id, path, created_at FROM page_views
      WHERE session_id IN (${idList}) AND created_at >= ${fromISO} AND created_at <= ${toISO}
      ORDER BY session_id, created_at`)).rows as Row[];
    for (const t of trail) (trailBy[t.session_id as string] ??= []).push({ path: t.path as string, created_at: t.created_at as string });

    const carts = (await db.execute(sql`SELECT session_id, phone FROM abandoned_carts WHERE session_id IN (${idList})`)).rows as Row[];
    for (const c of carts) cartBy[c.session_id as string] = { phone: (c.phone as string) ?? null };

    const phones = [...new Set(Object.values(cartBy).map((c) => c.phone).filter(Boolean))] as string[];
    if (phones.length) {
      const pl = sql.join(phones.map((x) => sql`${x}`), sql`, `);
      const names = (await db.execute(sql`SELECT phone, name FROM customers WHERE phone IN (${pl})`)).rows as Row[];
      for (const n of names) nameByPhone[n.phone as string] = n.name as string;
      const ord = (await db.execute(sql`SELECT customer_phone, created_at FROM orders WHERE customer_phone IN (${pl}) AND status <> 'CANCELLED'`)).rows as Row[];
      for (const o of ord) (orderTimesByPhone[o.customer_phone as string] ??= []).push(new Date(o.created_at as string).getTime());
    }
    const vids = [...new Set(sessRows.map((r) => r.visitor_id as string).filter(Boolean))];
    if (vids.length) {
      const vl = sql.join(vids.map((x) => sql`${x}`), sql`, `);
      const fs = (await db.execute(sql`SELECT visitor_id, min(created_at) AS first_seen FROM page_views WHERE visitor_id IN (${vl}) GROUP BY visitor_id`)).rows as Row[];
      for (const f of fs) firstSeenByVisitor[f.visitor_id as string] = new Date(f.first_seen as string).getTime();
    }
  }

  const journeys = sessRows.map((r) => {
    const sid = r.session_id as string;
    const vid = (r.visitor_id as string) || null;
    const trail = trailBy[sid] ?? [];
    const steps = trail.map((t, i) => {
      const next = trail[i + 1];
      const dur = next ? (new Date(next.created_at).getTime() - new Date(t.created_at).getTime()) / 1000 : null;
      return { path: t.path, dur };
    });
    const phone = cartBy[sid]?.phone ?? null;
    const startMs = new Date(r.started as string).getTime();
    const endMs = new Date(r.ended as string).getTime();
    const purchased = !!phone && (orderTimesByPhone[phone] ?? []).some((t) => t >= startMs && t <= endMs + 2 * 3600_000);
    const returningVisit = !!vid && firstSeenByVisitor[vid] != null && firstSeenByVisitor[vid] < startMs - 60_000;
    return {
      sid, started: new Date(r.started as string), device: (r.device as string) || "?",
      source: sourceLabel(r.referrer as string | null, r.landing as string),
      exit: pageLabel(r.exit_path as string), reachedCheckout: r.reached_checkout as boolean, steps,
      phone, customer: phone ? (nameByPhone[phone] ?? null) : null,
      addedToCart: !!phone, purchased, returningVisit,
      totalSec: (endMs - startMs) / 1000,
    };
  });

  const shown = journeys.length;
  const rawTotal = totals.sessions as number;
  const truncated = shown >= LIMIT;

  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ from: dateVal(fromDate), to: dateVal(toDate), ...(phoneFilter ? { phone: phoneFilter } : {}), ...extra });
    return `?${u.toString()}`;
  };
  const preset = (fromD: string, toD: string) => `?from=${fromD}&to=${toD}${phoneFilter ? `&phone=${phoneFilter}` : ""}`;
  const dAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
  const presets: [string, string, string][] = [
    ["اليوم", todayStr, todayStr],
    ["أمس", dAgo(1), dAgo(1)],
    ["٧ أيام", dAgo(7), todayStr],
    ["٣٠ يوم", dAgo(30), todayStr],
  ];
  const exportUrl = `/api/admin/export/?type=journeys&from=${dateVal(fromDate)}&to=${dateVal(toDate)}`;

  const funnelRows: [string, number, string][] = [
    ["زيارات", funnel.visits, "#505445"], ["شافوا منتج", funnel.product, "#a66a4c"],
    ["أضافوا للسلة", funnel.cart, "#c9a961"], ["وصلوا الدفع", funnel.checkout, "#c08a6e"],
    ["اشتروا", funnel.bought, "#5b8a4e"],
  ];

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">رحلات الزوّار</h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {phoneFilter ? <>رحلات الزبون <b className="font-num text-ink" dir="ltr">{phoneFilter}</b></> : "زوّار فريدون، عائدون، وقمع التحويل — من بياناتك مباشرة."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={exportUrl} download className="text-[12.5px] font-bold text-olive">⬇ تصدير CSV</a>
          {phoneFilter && <Link href={qs({})} className="text-[12.5px] font-bold text-accent">× كل الزوّار</Link>}
        </div>
      </div>

      {/* اختصارات سريعة */}
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map(([label, f, t]) => {
          const active = dateVal(fromDate) === f && dateVal(toDate) === t;
          return (
            <Link key={label} href={preset(f, t)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-colors ${active ? "border-olive bg-olive text-olive-text" : "border-line bg-card text-muted hover:bg-bg-alt"}`}>
              {label}
            </Link>
          );
        })}
      </div>

      <form className="mt-3 flex flex-wrap items-end gap-2.5 rounded-[8px] border border-line bg-card p-3.5">
        {phoneFilter && <input type="hidden" name="phone" value={phoneFilter} />}
        <label className="text-[11.5px] font-semibold text-muted">من
          <input type="date" name="from" max={todayStr} defaultValue={dateVal(fromDate)} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-2 text-[13px]" /></label>
        <label className="text-[11.5px] font-semibold text-muted">إلى
          <input type="date" name="to" max={todayStr} defaultValue={dateVal(toDate)} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-2 text-[13px]" /></label>
        <button className="rounded-[5px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">عرض</button>
      </form>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          ["زوّار فريدون", totals.visitors as number], ["عائدون", returning], ["زيارات فعّالة", funnel.visits],
          ["عملاء جدد", totals.new_customers as number], ["اشتروا", funnel.bought], ["متوسط الوقت", fmtDur(avgSec)],
        ].map(([label, val], i) => (
          <div key={i} className="rounded-[7px] border border-line bg-card px-2 py-3 text-center">
            <p className="font-num text-[19px] font-bold leading-none text-ink">{val as React.ReactNode}</p>
            <p className="mt-1.5 text-[10px] leading-tight text-muted">{label as string}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[8px] border border-line bg-card p-4">
        <p className="mb-3 text-[12px] font-bold text-muted">قمع التحويل</p>
        <div className="space-y-2">
          {funnelRows.map(([label, n, color]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-[11.5px] text-ink">{label}</span>
              <div className="h-5 flex-1 overflow-hidden rounded-[4px] bg-bg-alt">
                <div className="flex h-full items-center justify-end pe-2" style={{ width: `${Math.max(pct(n), 4)}%`, background: color }}>
                  <span className="font-num text-[10px] font-bold text-white">{pct(n)}%</span>
                </div>
              </div>
              <span className="font-num w-8 shrink-0 text-end text-[12px] font-bold text-ink">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {!phoneFilter && !showAll && rawTotal > funnel.visits && (
        <p className="mt-2.5 text-[11.5px] text-muted">
          إجمالي {rawTotal} زيارة · خُفيت {rawTotal - funnel.visits} قصيرة (ارتداد/زحف). <Link href={qs({ all: "1" })} className="font-bold text-accent">عرض الكل</Link>
        </p>
      )}
      {truncated && <p className="mt-1 text-[11.5px] text-accent">الأرقام أعلاه لكل النطاق · البطاقات تعرض أحدث {LIMIT} — ضيّق التاريخ لرؤية الأقدم.</p>}

      <div className="mt-4 space-y-2.5">
        {shown === 0 && (
          <div className="rounded-[8px] border border-dashed border-line bg-card p-10 text-center text-[13px] text-muted">لا زيارات في هذا المدى.</div>
        )}
        {journeys.map((j) => (
          <div key={j.sid} className="rounded-[8px] border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                <span className="h-2 w-2 rounded-full" style={{ background: srcDot(j.source) }} />{j.source}
              </span>
              <span className="text-muted">{j.device === "mobile" ? "📱 جوال" : j.device === "tablet" ? "📲 تابلت" : "💻 كمبيوتر"}</span>
              {j.returningVisit && <span className="rounded-full bg-accent/12 px-2 py-0.5 font-bold text-accent">عائد</span>}
              {j.customer && (
                <Link href={`/alikhazf25/customers/${j.phone}/`} className="rounded-full bg-olive/10 px-2 py-0.5 font-bold text-olive">{j.customer}</Link>
              )}
              <span className="font-num text-muted">{j.started.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="ms-auto font-num font-bold text-ink">⏱ {fmtDur(j.totalSec)}</span>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[11.5px]">
              {j.steps.map((st, i) => {
                const isProduct = st.path.replace(/\/+$/, "").split("?")[0] === "/product";
                return (
                  <span key={i} className="flex items-center gap-1">
                    <span className={`rounded-[4px] px-2 py-1 font-semibold ${isProduct ? "bg-clay/12 text-clay" : "bg-bg-alt text-ink"}`}>
                      {pageLabel(st.path)}{st.dur != null && <span className="font-num ms-1 font-normal text-muted">{fmtDur(st.dur)}</span>}
                    </span>
                    {i < j.steps.length - 1 && <span className="text-muted/40">←</span>}
                  </span>
                );
              })}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10.5px] font-bold">
              {j.addedToCart && <span className="rounded-full bg-gold/20 px-2.5 py-1 text-ink">أضاف للسلة</span>}
              {j.reachedCheckout && <span className="rounded-full bg-accent/12 px-2.5 py-1 text-accent">وصل الدفع</span>}
              {j.purchased
                ? <span className="rounded-full bg-ok/15 px-2.5 py-1 text-ok">✓ اشترى</span>
                : <span className="rounded-full bg-bg-alt px-2.5 py-1 text-muted">خرج من: {j.exit}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        «فريدون/عائدون» بمعرّف دائم يبدأ من الآن. أرقام هذي الصفحة من قاعدتك (فور فتح الصفحة) فتختلف عن GA4/Pixel/Clarity (تحميل متأخّر + فلترة روبوتات + عيّنات). «اشترى» فقط لطلب ضمن الزيارة نفسها.
      </p>
    </div>
  );
}
