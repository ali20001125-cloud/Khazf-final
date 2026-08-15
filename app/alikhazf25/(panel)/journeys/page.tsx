/**
 * رحلات الزوّار — لكل زيارة: المصدر، تسلسل الصفحات وأوقاتها، المنتج (بالاسم)،
 * السلة/الدفع/الشراء، الجهاز، الخروج، الوقت الإجمالي، والزبون إن عُرف.
 * مفلترة بالتاريخ · وبرقم زبون (?phone=) · حيّة دائماً.
 */
import Link from "next/link";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
  const toDate = sp.to ? new Date(sp.to + "T23:59:59") : new Date();
  const fromDate = sp.from ? new Date(sp.from + "T00:00:00") : new Date(Date.now() - 7 * 86400_000);
  const fromISO = fromDate.toISOString(), toISO = toDate.toISOString();
  const dateVal = (d: Date) => d.toISOString().slice(0, 10);
  const phoneFilter = sp.phone?.trim() || null;
  const showAll = sp.all === "1";

  /* خرائط مساعدة: اسم المنتج من الـslug */
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

  /* عملاء جدد في المدى */
  const newCust = ((await db.execute(sql`
    SELECT count(*)::int n FROM customers
    WHERE created_at >= ${fromISO} AND created_at <= ${toISO} AND phone NOT LIKE 'auth:%'`)).rows[0] as Row).n as number;

  /* تجميع الجلسات */
  const sessRows = (await db.execute(sql`
    SELECT session_id,
      min(created_at) AS started, max(created_at) AS ended, count(*)::int AS pages,
      (array_agg(referrer ORDER BY created_at) FILTER (WHERE referrer IS NOT NULL AND referrer <> ''))[1] AS referrer,
      (array_agg(device ORDER BY created_at))[1] AS device,
      (array_agg(path ORDER BY created_at))[1] AS landing,
      (array_agg(path ORDER BY created_at DESC))[1] AS exit_path,
      bool_or(path LIKE '/checkout%') AS reached_checkout,
      bool_or(path LIKE '/product%') AS saw_product
    FROM page_views
    WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
    GROUP BY session_id ORDER BY started DESC LIMIT 300`)).rows as Row[];

  const ids = sessRows.map((r) => r.session_id as string);
  const trailBy: Record<string, { path: string; created_at: string }[]> = {};
  const cartBy: Record<string, { phone: string | null }> = {};
  const nameByPhone: Record<string, string> = {};
  let purchasedPhones = new Set<string>();

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
      const ord = (await db.execute(sql`
        SELECT DISTINCT customer_phone FROM orders
        WHERE customer_phone IN (${pl}) AND status <> 'CANCELLED'`)).rows as Row[];
      purchasedPhones = new Set(ord.map((x) => x.customer_phone as string));
    }
  }

  let journeys = sessRows.map((r) => {
    const sid = r.session_id as string;
    const trail = trailBy[sid] ?? [];
    const steps = trail.map((t, i) => {
      const next = trail[i + 1];
      const dur = next ? (new Date(next.created_at).getTime() - new Date(t.created_at).getTime()) / 1000 : null;
      return { path: t.path, dur };
    });
    const phone = cartBy[sid]?.phone ?? null;
    return {
      sid, started: new Date(r.started as string), device: (r.device as string) || "?",
      pages: r.pages as number, source: sourceLabel(r.referrer as string | null, r.landing as string),
      exit: pageLabel(r.exit_path as string), reachedCheckout: r.reached_checkout as boolean,
      sawProduct: r.saw_product as boolean, steps,
      phone, customer: phone ? (nameByPhone[phone] ?? null) : null,
      addedToCart: !!phone, purchased: !!phone && purchasedPhones.has(phone),
      totalSec: (new Date(r.ended as string).getTime() - new Date(r.started as string).getTime()) / 1000,
    };
  });

  const rawCount = journeys.length;
  if (phoneFilter) journeys = journeys.filter((j) => j.phone === phoneFilter);
  // زيارات فعّالة: صفحتان+ أو ٥ ثوانٍ+ (نخفي الارتدادات/الزحف) — إلا لو طُلب الكل
  const engaged = showAll || phoneFilter ? journeys : journeys.filter((j) => j.pages >= 2 || j.totalSec >= 5);

  const kpi = {
    visits: engaged.length, newCust,
    product: engaged.filter((j) => j.sawProduct).length,
    cart: engaged.filter((j) => j.addedToCart).length,
    checkout: engaged.filter((j) => j.reachedCheckout).length,
    bought: engaged.filter((j) => j.purchased).length,
    avgSec: engaged.length ? engaged.reduce((t, j) => t + j.totalSec, 0) / engaged.length : 0,
  };

  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ from: dateVal(fromDate), to: dateVal(toDate), ...(phoneFilter ? { phone: phoneFilter } : {}), ...extra });
    return `?${u.toString()}`;
  };

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">رحلات الزوّار</h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {phoneFilter ? <>رحلات الزبون <b className="font-num text-ink" dir="ltr">{phoneFilter}</b></> : "من وين دخل الزائر، وين تنقّل، كم بقى، وشنو سوّى."}
          </p>
        </div>
        {phoneFilter && <Link href={qs({})} className="text-[12.5px] font-bold text-accent">× كل الزوّار</Link>}
      </div>

      {/* فلتر التاريخ */}
      <form className="mt-4 flex flex-wrap items-end gap-2.5 rounded-[8px] border border-line bg-card p-3.5">
        {phoneFilter && <input type="hidden" name="phone" value={phoneFilter} />}
        <label className="text-[11.5px] font-semibold text-muted">من
          <input type="date" name="from" defaultValue={dateVal(fromDate)} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-2 text-[13px]" /></label>
        <label className="text-[11.5px] font-semibold text-muted">إلى
          <input type="date" name="to" defaultValue={dateVal(toDate)} className="mt-1 block rounded-[5px] border border-line bg-bg px-3 py-2 text-[13px]" /></label>
        <button className="rounded-[5px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">عرض</button>
      </form>

      {/* مؤشرات */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {[
          ["زيارات فعّالة", kpi.visits], ["عملاء جدد", kpi.newCust], ["شافوا منتج", kpi.product],
          ["أضافوا للسلة", kpi.cart], ["وصلوا الدفع", kpi.checkout], ["اشتروا", kpi.bought],
          ["متوسط الوقت", fmtDur(kpi.avgSec)],
        ].map(([label, val], i) => (
          <div key={i} className="rounded-[7px] border border-line bg-card px-2 py-3 text-center">
            <p className="font-num text-[19px] font-bold leading-none text-ink">{val as React.ReactNode}</p>
            <p className="mt-1.5 text-[10px] leading-tight text-muted">{label as string}</p>
          </div>
        ))}
      </div>

      {!phoneFilter && !showAll && rawCount > kpi.visits && (
        <p className="mt-2.5 text-[11.5px] text-muted">
          خُفيت {rawCount - kpi.visits} زيارة قصيرة (ارتداد/زحف). <Link href={qs({ all: "1" })} className="font-bold text-accent">عرض الكل</Link>
        </p>
      )}

      {/* البطاقات */}
      <div className="mt-4 space-y-2.5">
        {engaged.length === 0 && (
          <div className="rounded-[8px] border border-dashed border-line bg-card p-10 text-center text-[13px] text-muted">لا زيارات في هذا المدى.</div>
        )}
        {engaged.map((j) => (
          <div key={j.sid} className="rounded-[8px] border border-line bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px]">
              <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                <span className="h-2 w-2 rounded-full" style={{ background: srcDot(j.source) }} />{j.source}
              </span>
              <span className="text-muted">{j.device === "mobile" ? "📱 جوال" : j.device === "tablet" ? "📲 تابلت" : "💻 كمبيوتر"}</span>
              {j.customer && (
                <Link href={`/alikhazf25/customers/${j.phone}/`} className="rounded-full bg-olive/10 px-2 py-0.5 font-bold text-olive">{j.customer}</Link>
              )}
              <span className="font-num text-muted">{j.started.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="ms-auto font-num font-bold text-ink">⏱ {fmtDur(j.totalSec)}</span>
            </div>

            {/* المسار */}
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
        اسم المنتج ومصدر الإعلان يظهران للزيارات الجديدة بعد آخر تحديث. لعزل مصدر إعلانات Instagram/Facebook بدقّة أضِف
        <span className="font-num" dir="ltr"> ?utm_source=instagram </span> لروابطها. «رجع لاحقاً؟» يحتاج معرّفاً دائماً (تعديل قادم).
      </p>
    </div>
  );
}
