/**
 * رحلات الزوّار — لكل زيارة: المصدر، تسلسل الصفحات وأوقاتها، المنتج، السلة/الدفع/الشراء،
 * الجهاز، صفحة الخروج، والوقت الإجمالي. يُبنى من بيانات المتجر نفسها (page_views + السلات + الطلبات).
 * مفلتر بالتاريخ · حيّ دائماً.
 */
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/* ── أدوات عرض ── */
function fmtDur(sec: number | null): string {
  if (sec == null || sec < 0) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s} ث`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}:${String(r).padStart(2, "0")} د` : `${m} د`;
}

function splitPath(full: string): { pathname: string; query: string } {
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

/* اسم الصفحة بالعربي (+ المنتج إن وُجد) */
function pageLabel(full: string): string {
  const { pathname, query } = splitPath(full);
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/product") { const c = param(query, "c") || param(query, "t"); return c ? `منتج · ${c}` : "منتج"; }
  const map: Record<string, string> = {
    "/": "الرئيسية", "/products": "المنتجات", "/box": "البوكس", "/cart": "السلة",
    "/checkout": "الدفع", "/account": "حسابي", "/offers": "العروض", "/start": "ابدأ",
    "/recipes": "الوصفات", "/journal": "المدوّنة", "/about": "عن خزف", "/contact": "تواصل",
    "/faq": "الأسئلة", "/shipping": "الشحن", "/returns": "الاستبدال", "/login": "الدخول",
    "/track": "تتبّع الطلب",
  };
  return map[p] ?? p;
}

/* المصدر: من وسوم UTM في صفحة الدخول، وإلا من referrer */
function sourceLabel(referrer: string | null, landing: string): string {
  const utm = param(splitPath(landing).query, "utm_source");
  const raw = (utm || referrer || "").toLowerCase();
  if (!raw) return "مباشر / تطبيق";
  if (raw.includes("instagram") || raw.includes("ig")) return "Instagram";
  if (raw.includes("facebook") || raw.includes("fb") || raw.includes("fbclid")) return "Facebook";
  if (raw.includes("google")) return "Google";
  if (raw.includes("tiktok")) return "TikTok";
  if (raw.includes("t.co") || raw.includes("twitter") || raw === "x") return "X";
  if (raw.includes("khazf")) return "داخل الموقع";
  try { return new URL(referrer!).hostname.replace(/^www\./, ""); } catch { return utm || "أخرى"; }
}

type Row = Record<string, unknown>;

export default async function JourneysPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = new Date();
  const toDate = sp.to ? new Date(sp.to + "T23:59:59") : today;
  const fromDate = sp.from ? new Date(sp.from + "T00:00:00") : new Date(Date.now() - 7 * 86400_000);
  const fromISO = fromDate.toISOString(), toISO = toDate.toISOString();
  const dateVal = (d: Date) => d.toISOString().slice(0, 10);

  /* ١) تجميع الجلسات في المدى */
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
    GROUP BY session_id
    ORDER BY started DESC
    LIMIT 100`)).rows as Row[];

  const ids = sessRows.map((r) => r.session_id as string);
  const trailBy: Record<string, { path: string; created_at: string }[]> = {};
  const cartBy: Record<string, { phone: string | null; items: unknown[] }> = {};
  let purchasedPhones = new Set<string>();

  if (ids.length) {
    const idList = sql.join(ids.map((x) => sql`${x}`), sql`, `);
    const trail = (await db.execute(sql`
      SELECT session_id, path, created_at FROM page_views
      WHERE session_id IN (${idList}) AND created_at >= ${fromISO} AND created_at <= ${toISO}
      ORDER BY session_id, created_at`)).rows as Row[];
    for (const t of trail) (trailBy[t.session_id as string] ??= []).push({ path: t.path as string, created_at: t.created_at as string });

    const carts = (await db.execute(sql`
      SELECT session_id, phone, items FROM abandoned_carts WHERE session_id IN (${idList})`)).rows as Row[];
    for (const c of carts) cartBy[c.session_id as string] = { phone: (c.phone as string) ?? null, items: (c.items as unknown[]) ?? [] };

    const ph = (await db.execute(sql`
      SELECT DISTINCT customer_phone FROM orders
      WHERE created_at >= ${fromISO} AND created_at <= ${toISO} AND status <> 'CANCELLED'`)).rows as Row[];
    purchasedPhones = new Set(ph.map((x) => x.customer_phone as string));
  }

  const journeys = sessRows.map((r) => {
    const sid = r.session_id as string;
    const trail = trailBy[sid] ?? [];
    const steps = trail.map((t, i) => {
      const next = trail[i + 1];
      const dur = next ? (new Date(next.created_at).getTime() - new Date(t.created_at).getTime()) / 1000 : null;
      return { path: t.path, dur };
    });
    const cart = cartBy[sid];
    const addedToCart = !!cart && (cart.items?.length ?? 0) > 0;
    const purchased = !!cart?.phone && purchasedPhones.has(cart.phone);
    const totalSec = (new Date(r.ended as string).getTime() - new Date(r.started as string).getTime()) / 1000;
    return {
      sid, started: new Date(r.started as string), device: (r.device as string) || "?",
      pages: r.pages as number, source: sourceLabel(r.referrer as string | null, r.landing as string),
      exit: pageLabel(r.exit_path as string), reachedCheckout: r.reached_checkout as boolean,
      sawProduct: r.saw_product as boolean, steps, addedToCart, purchased, totalSec,
    };
  });

  /* مؤشرات علوية */
  const kpi = {
    visits: journeys.length,
    product: journeys.filter((j) => j.sawProduct).length,
    cart: journeys.filter((j) => j.addedToCart).length,
    checkout: journeys.filter((j) => j.reachedCheckout).length,
    bought: journeys.filter((j) => j.purchased).length,
    avgSec: journeys.length ? journeys.reduce((t, j) => t + j.totalSec, 0) / journeys.length : 0,
  };

  const srcColor = (s: string) =>
    s === "Instagram" ? "#c13584" : s === "Facebook" ? "#1877f2" : s === "Google" ? "#0f9d58"
    : s === "TikTok" ? "#111" : "#6e6459";

  return (
    <div>
      <h1 className="text-[22px] font-bold">رحلات الزوّار</h1>
      <p className="mt-1 text-[12.5px] text-muted">كل زيارة بمعرّفها: من وين دخل، وين تنقّل، كم بقى، وشنو سوّى.</p>

      {/* فلتر التاريخ */}
      <form className="mt-5 flex flex-wrap items-end gap-3 rounded-[6px] border border-line bg-card p-4">
        <label className="text-[12px] font-semibold text-muted">
          من
          <input type="date" name="from" defaultValue={dateVal(fromDate)} className="mt-1 block rounded-[4px] border border-line bg-bg px-3 py-2 text-[13px]" />
        </label>
        <label className="text-[12px] font-semibold text-muted">
          إلى
          <input type="date" name="to" defaultValue={dateVal(toDate)} className="mt-1 block rounded-[4px] border border-line bg-bg px-3 py-2 text-[13px]" />
        </label>
        <button className="rounded-[4px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">عرض</button>
      </form>

      {/* مؤشرات */}
      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[6px] bg-line md:grid-cols-6">
        {[
          ["زيارات", kpi.visits], ["شافوا منتج", kpi.product], ["أضافوا للسلة", kpi.cart],
          ["وصلوا الدفع", kpi.checkout], ["اشتروا", kpi.bought], ["متوسط الوقت", fmtDur(kpi.avgSec)],
        ].map(([label, val]) => (
          <div key={label as string} className="bg-card px-3 py-3.5 text-center">
            <p className="font-num text-[18px] font-bold">{val as React.ReactNode}</p>
            <p className="mt-0.5 text-[10.5px] text-muted">{label as string}</p>
          </div>
        ))}
      </div>

      {/* البطاقات */}
      <div className="mt-5 space-y-3">
        {journeys.length === 0 && (
          <div className="rounded-[6px] border border-dashed border-line bg-card p-10 text-center text-[13px] text-muted">
            لا زيارات في هذا المدى — جرّب تاريخاً أوسع.
          </div>
        )}
        {journeys.map((j) => (
          <div key={j.sid} className="rounded-[6px] border border-line bg-card p-4">
            {/* ترويسة */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="rounded-[3px] px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: srcColor(j.source) }}>{j.source}</span>
              <span className="text-[11.5px] text-muted">{j.device === "mobile" ? "📱 جوال" : j.device === "tablet" ? "📲 تابلت" : "💻 كمبيوتر"}</span>
              <span className="font-num text-[11.5px] text-muted">{j.started.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="font-num text-[11px] text-muted/70">#{j.sid.slice(-6)}</span>
              <span className="ms-auto font-num text-[12px] font-bold">⏱ {fmtDur(j.totalSec)}</span>
            </div>

            {/* المسار */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
              {j.steps.map((st, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="rounded-[3px] bg-bg-alt px-2 py-1 font-semibold">
                    {pageLabel(st.path)}
                    {st.dur != null && <span className="font-num ms-1 text-muted">{fmtDur(st.dur)}</span>}
                  </span>
                  {i < j.steps.length - 1 && <span className="text-muted/50">←</span>}
                </span>
              ))}
            </div>

            {/* شارات النتيجة */}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px] font-bold">
              {j.sawProduct && <span className="rounded-full bg-bg-alt px-2.5 py-1 text-ink">شاف منتج</span>}
              {j.addedToCart && <span className="rounded-full bg-gold/20 px-2.5 py-1 text-ink">أضاف للسلة</span>}
              {j.reachedCheckout && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-accent">وصل الدفع</span>}
              {j.purchased
                ? <span className="rounded-full bg-ok/15 px-2.5 py-1 text-ok">✓ اشترى</span>
                : <span className="rounded-full bg-bg-alt px-2.5 py-1 text-muted">خرج من: {j.exit}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-muted">
        ملاحظة: زيارات الجوال من Instagram/Facebook قد تظهر «مباشر» لأن التطبيقات تخفي المصدر — لعزلها بدقّة، أضِف وسم
        <span className="font-num" dir="ltr"> ?utm_source=instagram </span> لروابط إعلاناتك. «أي منتج» و«الشراء» يظهران للزيارات الجديدة بعد هذا التحديث.
      </p>
    </div>
  );
}
