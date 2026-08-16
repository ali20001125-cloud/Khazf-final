"use client";
/**
 * الرئيسية V2 — واجهة جديدة من الصفر (تجريبي staging).
 * الهوية: مستوحاة من 48 East — نظيف عصري، برتقالي ناري #FF6C0E، بس بوضع نهاري فاتح دافئ.
 * كل قسم يمرّ باختبار الـ٥ ثوان ويخدم الطلب. لوحة الألوان محلية ومستقلّة.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig, useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";

/* ═══ لوحة الألوان (فاتح + برتقالي 48e) ═══ */
const C = {
  bg: "#f4f1ec",       // كريمي دافئ (الخلفية الأساسية)
  alt: "#ece7df",      // بديل
  card: "#ffffff",     // البطاقات
  ink: "#181410",      // نص أساسي (أسود دافئ)
  dim: "#6f665a",      // نص ثانوي
  line: "#e3ddd2",     // خطوط
  accent: "#FF6C0E",   // برتقالي 48e
  accentSoft: "#fff1e6",
};
const addBtn = (name: string) => `أضِف ${name}`;

const FEATURED_SLUG = "dorado";

/* ═══ ١) البطل ═══ */
export function HeroX() {
  const { coffees } = useCatalog();
  const { addToCart, showToast } = useStore();
  const config = useSiteConfig();
  const available = coffees.filter((c) => !c.soldOut && c.image);
  const pick =
    available.find((c) => c.slug.toLowerCase() === FEATURED_SLUG) ??
    [...available].sort((a, b) => b.reviewsCount - a.reviewsCount)[0];

  const offers = [
    "توصيل ١–٢ يوم",
    "الدفع عند الاستلام",
    config.freeDeliveryThreshold > 0 ? `توصيل مجاني فوق ${formatIQD(config.freeDeliveryThreshold)}` : `${config.cashbackPct}٪ نقاط ولاء`,
  ];

  return (
    <section style={{ background: C.bg, color: C.ink }}>
      <div className="mx-auto grid max-w-5xl items-center gap-7 px-5 py-9 md:grid-cols-2 md:gap-10 md:px-8 md:py-14">
        <div className="order-2 md:order-1">
          <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.accent }}>قهوة مختصّة · العراق</span>
          <h1 className="mt-3 text-[38px] font-black leading-[1.05] tracking-tight md:text-[58px]">
            اكتشف<br />قهوتك.
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-[1.85]" style={{ color: C.dim }}>
            محاصيل محدّدة المصدر، نحمّصها بدفعات صغيرة وتوصلك طازجة خلال يوم إلى يومين.
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {offers.map((o) => (
              <span key={o} className="rounded-full px-3 py-1 text-[11.5px] font-bold"
                style={{ background: C.card, border: `1px solid ${C.line}`, color: C.ink }}>{o}</span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {pick && (
              <Link href={`/product/?c=${pick.slug}`}
                className="flex min-h-[52px] items-center justify-center px-8 text-[15px] font-extrabold transition-transform active:scale-[0.98]"
                style={{ background: C.accent, color: "#fff", borderRadius: 999 }}>
                اطلب {pick.name}
              </Link>
            )}
            <Link href="/products/?cat=coffee"
              className="flex min-h-[52px] items-center justify-center px-8 text-[15px] font-extrabold transition-colors active:scale-[0.98]"
              style={{ background: "transparent", border: `1.5px solid ${C.ink}`, color: C.ink, borderRadius: 999 }}>
              كل المحاصيل
            </Link>
          </div>
        </div>

        {pick && (
          <div className="order-1 md:order-2">
            <Link href={`/product/?c=${pick.slug}`} className="group relative block overflow-hidden shadow-lg"
              style={{ borderRadius: 20, background: C.alt }} aria-label={pick.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pick.image!} alt={pick.name}
                className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <span className="absolute right-4 top-4 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold"
                style={{ background: C.accent, color: "#fff" }}>اختيار خزف لك</span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5"
                style={{ background: "linear-gradient(to top, rgba(20,16,12,0.88), transparent)" }}>
                <p className="text-[27px] font-black leading-none text-white">{pick.name}</p>
                {pick.notes?.length > 0 && (
                  <p className="mt-1.5 text-[12.5px] font-bold" style={{ color: "#ffd9bd" }}>{pick.notes.slice(0, 3).join(" · ")}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-white">
                  <span className="font-num text-[19px] font-extrabold">{formatIQD(pick.prices.g250)}</span>
                  {pick.reviewsCount > 0 && (
                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.85)" }}>★ {pick.rating.toFixed(1)} · {pick.reviewsCount}</span>
                  )}
                </div>
              </div>
            </Link>
            <button
              onClick={() => { addToCart({ slug: pick.slug, variant: "G250", grind: "حبوب كاملة", name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250 }); showToast(`أُضيف ${pick.name} — جاهز بسلّتك`); }}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center text-[14px] font-extrabold transition-colors active:scale-[0.99]"
              style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.accent}`, borderRadius: 999 }}>
              أضِفه لسلّتك مباشرة ←
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══ ٢) شريط الثقة ═══ */
export function StripX() {
  return (
    <section style={{ background: C.ink, color: "#f4f1ec" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-5 py-3.5 text-[12.5px] font-bold md:px-8">
        {["تُحمَّص بطلبك", "توصيل ١–٢ يوم", "الدفع عند الاستلام", "محدّدة المصدر"].map((t, i) => (
          <span key={t} className="flex items-center gap-2.5">
            {i > 0 && <span style={{ color: C.accent }}>•</span>}{t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٣) المحاصيل ═══ */
export function CropsX() {
  const { coffees } = useCatalog();
  const { addToCart, showToast } = useStore();
  const config = useSiteConfig();
  const list = coffees.filter((c) => c.image);
  if (list.length === 0) return null;
  const bestSlug = (config.homeBestsellerSlug || "").trim().toLowerCase();
  const ordered = bestSlug
    ? [...list].sort((a, b) => (b.slug.toLowerCase() === bestSlug ? 1 : 0) - (a.slug.toLowerCase() === bestSlug ? 1 : 0))
    : list;
  const shown = ordered.slice(0, config.homeCropsCount ?? 10);

  return (
    <section style={{ background: C.bg, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.accent }}>THE CROPS</span>
            <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[40px]">المحاصيل</h2>
          </div>
          <Link href="/products/?cat=coffee" className="shrink-0 text-[13px] font-extrabold" style={{ color: C.accent }}>الكل ←</Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5">
          {shown.map((c) => {
            const best = bestSlug && c.slug.toLowerCase() === bestSlug;
            return (
              <div key={c.slug} className="flex flex-col overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }}>
                <Link href={`/product/?c=${c.slug}`} className="group relative block overflow-hidden" style={{ background: C.alt }} aria-label={c.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image!} alt={c.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                  {(best || c.badge) && (
                    <span className="absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                      style={{ background: C.accent, color: "#fff" }}>{best ? "الأكثر مبيعاً" : c.badge}</span>
                  )}
                  {c.soldOut && (
                    <span className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold" style={{ background: C.ink, color: "#fff" }}>نفد</span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-3.5">
                  <Link href={`/product/?c=${c.slug}`}>
                    <h3 className="text-[18px] font-black leading-tight">{c.name}</h3>
                  </Link>
                  {c.notes?.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-[11.5px] font-bold" style={{ color: C.accent }}>{c.notes.slice(0, 3).join(" · ")}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="font-num text-[15px] font-extrabold">{formatIQD(c.prices.g250)}</span>
                    {c.soldOut ? (
                      <span className="text-[12px] font-bold" style={{ color: C.dim }}>غير متوفّر</span>
                    ) : (
                      <button
                        onClick={() => { addToCart({ slug: c.slug, variant: "G250", grind: "حبوب كاملة", name: c.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: c.prices.g250 }); showToast(`أُضيف ${c.name} — جاهز بسلّتك`); }}
                        aria-label={addBtn(c.name)}
                        className="flex h-9 items-center justify-center px-4 text-[12.5px] font-extrabold transition-transform active:scale-[0.96]"
                        style={{ background: C.accent, color: "#fff", borderRadius: 999 }}>
                        أضِف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٤) ابنِ بوكسك ═══ */
export function BoxX() {
  return (
    <section style={{ background: C.accent, color: "#fff" }}>
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-5 py-11 md:flex-row md:items-center md:justify-between md:px-8 md:py-14">
        <div>
          <h2 className="text-[27px] font-black leading-tight md:text-[36px]">ابنِ بوكسك الخاص</h2>
          <p className="mt-2 max-w-md text-[14px] leading-[1.8]" style={{ color: "rgba(255,255,255,0.9)" }}>
            اختر محاصيلك المفضّلة، وكل ما زدت كِسبت أكثر — خصم يكبر مع البوكس وهدية بانتظارك.
          </p>
        </div>
        <Link href="/box/" className="flex min-h-[52px] shrink-0 items-center justify-center px-9 text-[15px] font-black transition-transform active:scale-[0.98]"
          style={{ background: "#fff", color: C.accent, borderRadius: 999 }}>
          ابدأ بوكسك ←
        </Link>
      </div>
    </section>
  );
}

/* ═══ ٥) ليش خزف ═══ */
export function WhyX() {
  const items = [
    ["دفعات صغيرة", "نحمّص قليل ونبيعه طازج — ما تشرب قهوة قديمة."],
    ["محدّدة المصدر", "نعرف مزرعتها وارتفاعها ومعالجتها — شفافية كاملة."],
    ["اختيار سهل", "لكل ذوق قهوة تشبهه — نرشّح لك الي يناسبك."],
  ];
  return (
    <section style={{ background: C.alt, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.accent }}>WHY KHAZF</span>
        <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[38px]">ليش خزف</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          {items.map(([t, d], i) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }} className="p-6">
              <span className="font-num text-[15px] font-black" style={{ color: C.accent }}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-[19px] font-black">{t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.8]" style={{ color: C.dim }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٦) التقييمات ═══ */
export function ReviewsX() {
  const { brandReviews } = useCatalog();
  const list = (brandReviews ?? []).filter((r) => r.quote).slice(0, 6);
  if (list.length === 0) return null;
  return (
    <section style={{ background: C.bg, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.accent }}>REVIEWS</span>
        <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[38px]">شنو يقولون عنّا</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
          {list.map((r, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }} className="flex flex-col p-5">
              <span className="text-[13px]" style={{ color: C.accent }}>{"★".repeat(Math.max(1, Math.min(5, r.rating || 5)))}</span>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-[1.85]">“{r.quote}”</p>
              <p className="mt-3 text-[12px] font-bold" style={{ color: C.dim }}>{r.author}{r.context ? ` · ${r.context}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٧) دعوة ختامية ═══ */
export function CtaX() {
  return (
    <section style={{ background: C.ink, color: "#f4f1ec" }}>
      <div className="mx-auto max-w-5xl px-5 py-14 text-center md:px-8 md:py-20">
        <h2 className="text-[30px] font-black leading-tight tracking-tight md:text-[44px]">جاهز تكتشف قهوتك؟</h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.85]" style={{ color: "rgba(244,241,236,0.68)" }}>
          محاصيل مختارة، توصلك طازجة خلال يوم–يومين، والدفع عند الاستلام.
        </p>
        <Link href="/products/?cat=coffee" className="mt-7 inline-flex min-h-[54px] items-center justify-center px-10 text-[15px] font-black transition-transform active:scale-[0.98]"
          style={{ background: C.accent, color: "#fff", borderRadius: 999 }}>
          تصفّح المحاصيل الآن ←
        </Link>
      </div>
    </section>
  );
}
