"use client";
/**
 * الرئيسية V2 — واجهة جديدة (تجريبي staging).
 * الهوية: نظيف عصري بوضع نهاري فاتح دافئ + ألوان البراند (طيني #8E574C · زيتوني #4E5443).
 * كل قسم يمرّ باختبار الـ٥ ثوان ويخدم الطلب. لوحة الألوان محلية ومستقلّة.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig, useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";

/* ═══ لوحة الألوان (فاتح + ألوان البراند) ═══ */
const C = {
  bg: "#f4f1ec",       // كريمي دافئ (الخلفية الأساسية)
  alt: "#ebe6dd",      // بديل
  card: "#ffffff",     // البطاقات
  ink: "#241e19",      // نص أساسي (بنّي داكن دافئ)
  dim: "#6f665a",      // نص ثانوي
  line: "#e3ddd2",     // خطوط
  clay: "#8E574C",     // طيني — الأساسي (أزرار/تمييز)
  claySoft: "#f2e9e5", // طيني فاتح جداً
  olive: "#4E5443",    // زيتوني — الأقسام الداكنة
};

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
          <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.clay }}>قهوة مختصّة · العراق</span>
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
                style={{ background: C.clay, color: "#fff", borderRadius: 999 }}>
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
                style={{ background: C.clay, color: "#fff" }}>اختيار خزف لك</span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5"
                style={{ background: "linear-gradient(to top, rgba(30,24,20,0.9), transparent)" }}>
                <p className="text-[27px] font-black leading-none text-white">{pick.name}</p>
                {pick.notes?.length > 0 && (
                  <p className="mt-1.5 text-[12.5px] font-bold" style={{ color: "#e7c9bd" }}>{pick.notes.slice(0, 3).join(" · ")}</p>
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
              style={{ background: C.claySoft, color: C.clay, border: `1px solid ${C.clay}`, borderRadius: 999 }}>
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
    <section style={{ background: C.olive, color: "#f4f1ec" }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-7 gap-y-2 px-5 py-3.5 text-[12.5px] font-bold md:px-8">
        {["تُحمَّص بطلبك", "توصيل ١–٢ يوم", "الدفع عند الاستلام", "محدّدة المصدر"].map((t, i) => (
          <span key={t} className="flex items-center gap-2.5">
            {i > 0 && <span style={{ color: "#c9b79f" }}>•</span>}{t}
          </span>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٣) البوكس — أهم قسم (مرفوع للأعلى) ═══ */
export function BoxFeatureX() {
  const config = useSiteConfig();
  const tiers = (config.boxTiers ?? []).slice().sort((a, b) => a.bags - b.bags);
  const reward = (t: { rewardType: string; value?: number }) =>
    t.rewardType === "PERCENT" ? `خصم ${t.value ?? 0}٪` : t.rewardType === "FREE_DELIVERY" ? "توصيل مجاني" : "هدية";

  return (
    <section style={{ background: C.clay, color: "#fff" }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="md:max-w-md">
            <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: "#f0d9cf" }}>BUILD YOUR BOX</span>
            <h2 className="mt-2 text-[30px] font-black leading-tight md:text-[42px]">ابنِ بوكسك الخاص</h2>
            <p className="mt-3 text-[14.5px] leading-[1.85]" style={{ color: "rgba(255,255,255,0.9)" }}>
              اختر محاصيلك المفضّلة معاً — وكل ما زدت كِسبت أكثر: خصم يكبر مع البوكس، توصيل مجاني، وهدية بانتظارك.
            </p>
            <Link href="/box/" className="mt-6 inline-flex min-h-[54px] items-center justify-center px-10 text-[16px] font-black transition-transform active:scale-[0.98]"
              style={{ background: "#fff", color: C.clay, borderRadius: 999 }}>
              ابدأ بناء بوكسك ←
            </Link>
          </div>

          {/* درجات المكافأة — تصاعدي */}
          {tiers.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 md:w-[300px]">
              {tiers.map((t) => (
                <div key={t.bags} className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <p className="font-num text-[26px] font-black leading-none">{t.bags}</p>
                  <p className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}>أكياس</p>
                  <p className="mt-2 text-[12.5px] font-extrabold">{reward(t)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٤) المحاصيل ═══ */
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
            <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.clay }}>THE CROPS</span>
            <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[40px]">المحاصيل</h2>
          </div>
          <Link href="/products/?cat=coffee" className="shrink-0 text-[13px] font-extrabold" style={{ color: C.clay }}>الكل ←</Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5">
          {shown.map((c) => {
            const best = bestSlug && c.slug.toLowerCase() === bestSlug;
            return (
              <div key={c.slug} className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18 }}>
                <Link href={`/product/?c=${c.slug}`} className="relative block overflow-hidden" style={{ background: C.alt }} aria-label={c.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image!} alt={c.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                  {(best || c.badge) && (
                    <span className="absolute right-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold shadow-sm"
                      style={{ background: C.clay, color: "#fff" }}>{best ? "الأكثر مبيعاً" : c.badge}</span>
                  )}
                  {c.soldOut && (
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-white"
                      style={{ background: "rgba(36,30,25,0.55)" }}>نفد مؤقتاً</span>
                  )}
                </Link>

                <div className="flex flex-1 flex-col p-3.5">
                  {c.country && (
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.14em]" style={{ color: C.dim }}>{c.country}</p>
                  )}
                  <Link href={`/product/?c=${c.slug}`} className="mt-0.5">
                    <h3 className="text-[18px] font-black leading-tight">{c.name}</h3>
                  </Link>
                  {c.notes?.length > 0 && (
                    <p className="mt-1 line-clamp-1 text-[11.5px] font-bold" style={{ color: C.clay }}>{c.notes.slice(0, 3).join(" · ")}</p>
                  )}
                  {c.reviewsCount > 0 && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: C.dim }}>
                      <span style={{ color: C.clay }}>★</span>
                      <span className="font-num font-bold" style={{ color: C.ink }}>{c.rating.toFixed(1)}</span>
                      <span>· {c.reviewsCount}</span>
                    </p>
                  )}

                  <div className="mt-auto pt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-num text-[17px] font-black">{formatIQD(c.prices.g250)}</span>
                      <span className="text-[10.5px] font-bold" style={{ color: C.dim }}>/ ٢٥٠غ</span>
                    </div>
                    {c.soldOut ? (
                      <div className="mt-2 flex min-h-[42px] items-center justify-center text-[12.5px] font-bold"
                        style={{ background: C.alt, color: C.dim, borderRadius: 999 }}>غير متوفّر حالياً</div>
                    ) : (
                      <button
                        onClick={() => { addToCart({ slug: c.slug, variant: "G250", grind: "حبوب كاملة", name: c.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: c.prices.g250 }); showToast(`أُضيف ${c.name} — جاهز بسلّتك`); }}
                        aria-label={`أضف ${c.name} للسلة`}
                        className="mt-2 flex min-h-[42px] w-full items-center justify-center gap-1.5 text-[13px] font-extrabold transition-transform active:scale-[0.98]"
                        style={{ background: C.clay, color: "#fff", borderRadius: 999 }}>
                        أضِف للسلّة
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

/* ═══ ٥) تسوّق حسب الفئة (الأدوات والأكواب) ═══ */
export function CategoriesX() {
  const { tools, toolsEnabled } = useCatalog();
  if (!toolsEnabled || tools.length === 0) return null;

  const pickImg = (match: (t: (typeof tools)[number]) => boolean) =>
    tools.find((t) => match(t) && t.images && t.images.length > 0)?.images?.[0] ?? null;

  const cats = [
    { label: "أدوات التقطير", href: "/products/?cat=drip", img: pickImg((t) => t.cats?.includes("تقطير")) },
    { label: "أدوات الإسبريسو", href: "/products/?cat=espresso", img: pickImg((t) => t.cats?.includes("إسبريسو")) },
    { label: "الأكواب", href: "/products/?cat=cups", img: pickImg((t) => t.cats?.includes("أكواب")) },
  ].filter((c) => c.img);
  if (cats.length === 0) return null;

  return (
    <section style={{ background: C.alt, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.clay }}>SHOP BY CATEGORY</span>
        <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[40px]">تسوّق حسب الفئة</h2>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
          {cats.map((cat) => (
            <Link key={cat.label} href={cat.href} className="group relative block overflow-hidden shadow-sm"
              style={{ borderRadius: 16, background: C.card }} aria-label={cat.label}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cat.img!} alt={cat.label} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4"
                style={{ background: "linear-gradient(to top, rgba(30,24,20,0.85), transparent)" }}>
                <span className="text-[17px] font-black text-white">{cat.label}</span>
                <span className="text-[13px] font-extrabold" style={{ color: "#f0d9cf" }}>تسوّق ←</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٦) ليش خزف ═══ */
export function WhyX() {
  const items = [
    ["دفعات صغيرة", "نحمّص قليل ونبيعه طازج — ما تشرب قهوة قديمة."],
    ["محدّدة المصدر", "نعرف مزرعتها وارتفاعها ومعالجتها — شفافية كاملة."],
    ["اختيار سهل", "لكل ذوق قهوة تشبهه — نرشّح لك الي يناسبك."],
  ];
  return (
    <section style={{ background: C.bg, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.clay }}>WHY KHAZF</span>
        <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[38px]">ليش خزف</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
          {items.map(([t, d], i) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }} className="p-6">
              <span className="font-num text-[15px] font-black" style={{ color: C.clay }}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-[19px] font-black">{t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.8]" style={{ color: C.dim }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٧) التقييمات ═══ */
export function ReviewsX() {
  const { brandReviews } = useCatalog();
  const list = (brandReviews ?? []).filter((r) => r.quote).slice(0, 6);
  if (list.length === 0) return null;
  return (
    <section style={{ background: C.alt, color: C.ink }}>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
        <span className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: C.clay }}>REVIEWS</span>
        <h2 className="mt-2 text-[30px] font-black tracking-tight md:text-[38px]">شنو يقولون عنّا</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
          {list.map((r, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16 }} className="flex flex-col p-5">
              <span className="text-[13px]" style={{ color: C.clay }}>{"★".repeat(Math.max(1, Math.min(5, r.rating || 5)))}</span>
              <p className="mt-2.5 flex-1 text-[13.5px] leading-[1.85]">“{r.quote}”</p>
              <p className="mt-3 text-[12px] font-bold" style={{ color: C.dim }}>{r.author}{r.context ? ` · ${r.context}` : ""}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٨) دعوة ختامية ═══ */
export function CtaX() {
  return (
    <section style={{ background: C.olive, color: "#f4f1ec" }}>
      <div className="mx-auto max-w-5xl px-5 py-14 text-center md:px-8 md:py-20">
        <h2 className="text-[30px] font-black leading-tight tracking-tight md:text-[44px]">جاهز تكتشف قهوتك؟</h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.85]" style={{ color: "rgba(244,241,236,0.72)" }}>
          محاصيل مختارة، توصلك طازجة خلال يوم–يومين، والدفع عند الاستلام.
        </p>
        <Link href="/products/?cat=coffee" className="mt-7 inline-flex min-h-[54px] items-center justify-center px-10 text-[15px] font-black transition-transform active:scale-[0.98]"
          style={{ background: "#f4f1ec", color: C.olive, borderRadius: 999 }}>
          تصفّح المحاصيل الآن ←
        </Link>
      </div>
    </section>
  );
}
