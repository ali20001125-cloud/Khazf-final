"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { Minus, Plus, Gift, Coffee as CoffeeIcon, Layers } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { Gift as GiftIcon } from "lucide-react";
import { useMotion, reduced } from "@/lib/motion";
import { useStore } from "@/lib/store";
import BagArt from "@/components/BagArt";

const tiers = [
  { n: "٣", label: "خصم ١٠٪" },
  { n: "٤", label: "خصم ٢٠٪" },
  { n: "٥", label: "توصيل مجاني" },
  { n: "٦", label: "اختر هديتك", gold: true },
];

const GIFT_ICONS = [CoffeeIcon, Layers, GiftIcon];

/* ══ المقدّمة المثبّتة: بطاقات بحركات متنوّعة ══ */
function BoxIntro() {
  const steps = [
    { n: "١", h: "اختر محاصيلك", p: "أربعة محاصيل مختصّة — امزج أو كرّر ما يناسب ذوقك. كل كيس ٢٥٠ غراماً." },
    { n: "٢", h: "ثلاثة أكياس فأكثر", p: "كلّما أضفت كيساً زاد توفيرك — يصل الخصم إلى ٢٠٪." },
    { n: "٣", h: "مكافآت تكبر معك", p: "توصيل مجّاني عند خمسة أكياس، وهديّة تختارها عند ستّة." },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pt-28 md:px-6 md:pt-32">
      <div className="text-center">
        <p className="reveal font-num text-[10px] tracking-[0.4em] text-muted">BUILD YOUR BOX</p>
        <h1 className="reveal mt-2 text-[28px] font-bold md:text-4xl">اصنع صندوقك</h1>
        <p className="reveal mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
          صندوقك الخاص من قهوة خزف — تختار محاصيله بنفسك، والمكافأة تكبر مع كل كيس تضيفه.
        </p>
      </div>
      {/* ثلاث خطوات بسيطة واضحة */}
      <div className="reveal mt-9 grid gap-3 sm:grid-cols-3">
        {steps.map((st) => (
          <div key={st.n} className="rounded-[20px] border border-line bg-card p-5 text-center">
            <span className="font-num mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-olive text-[15px] font-bold text-olive-text">{st.n}</span>
            <h3 className="mt-3 text-[16px] font-bold">{st.h}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{st.p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function hintFor(count: number): string {
  if (count === 0) return "ابدأ بأول كيس — كل كيس يقرّبك لمكافأة";
  if (count === 1) return "بداية موفقة! كيسان يفصلانك عن خصم ١٠٪";
  if (count === 2) return "كيس واحد بس… وخصم ١٠٪ صار لك";
  if (count === 3) return "مبروك! خصم ١٠٪ · أضف كيساً لخصم ٢٠٪";
  if (count === 4) return "خصم ٢٠٪ فعّال! كيس إضافي = توصيل مجاني";
  if (count === 5) return "توصيل مجاني! كيس أخير وتختار هديتك";
  return "وصلت للقمة — اختر هديتك تحت";
}

const discountFor = (c: number) => (c >= 4 ? 0.2 : c >= 3 ? 0.1 : 0);
// تقريب لأعلى 250 (نفس منطق الطلب والسلة) — الزبون يرى النسبة، والحساب مقرّب
const roundUp250 = (n: number) => Math.ceil(Math.max(0, n) / 250) * 250;

export default function BoxPage() {
  const scope = useMotion();
  const router = useRouter();
  const { addToCart, showToast, setBoxGiftChoice } = useStore();
  const { coffees, boxGiftNames } = useCatalog();
  const gifts = boxGiftNames.map((label, i) => ({ key: label, label, icon: GIFT_ICONS[i % GIFT_ICONS.length] }));
  // نحفظ اختيار الأكياس مؤقتاً حتى لا يضيع عند زيارة صفحة محصول والرجوع
  const [bags, setBags] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = sessionStorage.getItem("khazf_box_bags");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { sessionStorage.setItem("khazf_box_bags", JSON.stringify(bags)); } catch {}
  }, [bags]);
  const [showBar, setShowBar] = useState(false);
  const [gift, setGift] = useState<string | null>(null);

  const count = useMemo(
    () => Object.values(bags).reduce((s, n) => s + n, 0),
    [bags]
  );
  const subtotal = useMemo(
    () => coffees.reduce((s, c) => s + (bags[c.slug] ?? 0) * c.prices.g250, 0),
    [bags]
  );
  const discount = discountFor(count);
  const total = roundUp250(subtotal * (1 - discount));
  const savings = subtotal - total;

  const setBag = (slug: string, n: number) => {
    setBags((prev) => ({ ...prev, [slug]: Math.max(0, n) }));
    if (!reduced()) {
      gsap.fromTo(".big-count", { scale: 1.12 }, { scale: 1, duration: 0.45, ease: "back.out(2)" });
      gsap.fromTo(".total-num", { scale: 1.07 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
    }
  };

  const order = () => {
    const boxGroup = Date.now() % 1000000;
    for (const [slug, n] of Object.entries(bags)) {
      if (n <= 0) continue;
      const c = coffees.find((x) => x.slug === slug)!;
      addToCart(
        { slug: c.slug, variant: "G250", grind: "حبوب كاملة", name: c.name,
          meta: "بوكس · ٢٥٠غ", priceShown: c.prices.g250, boxGroup },
        n, true
      );
    }
    setBoxGiftChoice(gifts.find((g) => g.key === gift)?.label ?? null);
    showToast(`أُضيف بوكس ${count} أكياس للسلة — الخصم النهائي بالسلة`);
    try { sessionStorage.removeItem("khazf_box_bags"); } catch {}
    router.push("/cart/");
  };

  useEffect(() => {
    const onScroll = () => setShowBar(window.scrollY > window.innerHeight * 3.4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={scope} className="pb-32">
      <BoxIntro />
      {/* شريط ثابت مصغّر — يظهر عند النزول */}
      <div className={`fixed inset-x-0 top-0 z-30 border-b border-line bg-bg/95 backdrop-blur transition-all duration-300 ${showBar ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <span className="font-num flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-bold text-olive-text">{count}</span>
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-alt">
              <i className="block h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.min(count / 6, 1) * 100}%` }} />
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold text-muted">{hintFor(count)}</p>
          </div>
          {count >= 3 && (
            <button onClick={order} className="shrink-0 rounded-full bg-olive px-4 py-2 text-[12px] font-bold text-olive-text">أضف للسلة</button>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* التقدّم — يلتصق بأعلى الشاشة مباشرة عند التمرير (بلا فراغ) */}
        <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-bg-alt/97 px-4 pb-3 pt-3 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.15)] backdrop-blur">
          <div className="text-center">
          {/* شريط التقدّم + عدّاد صغير مدمج */}
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className={`font-num text-[18px] font-bold ${count > 0 ? "text-accent" : "text-muted"}`}>{count}</span>
            <span className="text-[12px] text-muted">{count === 1 ? "كيس" : "أكياس"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-alt">
            <i
              className="block h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.min(count / 6, 1) * 100}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {tiers.map((t, i) => {
              const on = count >= i + 3;
              return (
                <div key={t.n} className="text-center">
                  <div
                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors ${
                      on
                        ? t.gold
                          ? "border-gold bg-gold text-olive"
                          : "border-accent bg-accent text-olive-text"
                        : "border-line bg-card text-muted"
                    }`}
                    style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                  >
                    {t.n}
                  </div>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${
                      on ? (t.gold ? "text-gold" : "text-accent") : "text-muted"
                    }`}
                  >
                    {t.label}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-3 inline-block rounded-full bg-bg-alt px-5 py-1.5 text-[12px] font-semibold">
            {hintFor(count)}
          </p>
          </div>
        </div>

        {/* المحاصيل */}
        <div className="reveal-group mt-7 space-y-3">
          {coffees.filter((c) => !c.soldOut).map((c) => {
            const n = bags[c.slug] ?? 0;
            return (
              <div
                key={c.slug}
                className={`flex items-center gap-4 rounded-[18px] border bg-card p-4 transition-colors ${
                  n > 0 ? "border-accent/50" : "border-line"
                }`}
              >
                <Link
                  href={`/product/?c=${c.slug}`}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white"
                >
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <BagArt className="h-[75%] text-olive" accent={c.accent} />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/?c=${c.slug}`}>
                    <h3 className="font-bold">{c.name}</h3>
                  </Link>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {c.country} · {c.notes.join(" · ")}
                  </p>
                  <p className="font-num mt-1 text-[12px] font-semibold">
                    {formatIQD(c.prices.g250)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBag(c.slug, n - 1)}
                    disabled={n === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-line transition-colors hover:bg-bg-alt disabled:opacity-30"
                    aria-label={`أنقص ${c.name}`}
                  >
                    <Minus size={16} />
                  </button>
                  <span
                    className={`font-num w-6 text-center text-lg font-bold ${
                      n > 0 ? "text-accent" : "text-muted"
                    }`}
                  >
                    {n}
                  </span>
                  <button
                    onClick={() => setBag(c.slug, n + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-olive-text transition-transform hover:scale-105 active:scale-90"
                    aria-label={`زد ${c.name}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* الهدية — ظاهرة دائماً (تحفيز)، معطّلة حتى الوصول لـ٦ أكياس */}
        <div className={`mt-10 rounded-[22px] border p-6 text-center transition-all ${
          count >= 6 ? "border-gold/50 bg-gold/10" : "border-line bg-card"
        }`}>
          <Gift size={26} className={`mx-auto ${count >= 6 ? "text-gold" : "text-muted/50"}`} />
          <h2 className={`mt-3 text-xl font-bold ${count >= 6 ? "" : "text-muted"}`}>
            {count >= 6 ? "اختر هديتك" : "هديتك المجانية"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {count >= 6
              ? "وصلت لـ ٦ أكياس — هديتك علينا"
              : `أضف ${6 - count} ${6 - count === 1 ? "كيساً" : "أكياس"} لتفتح هديتك المجانية`}
          </p>
          <div className={`mt-6 grid grid-cols-2 gap-3 transition-opacity ${count >= 6 ? "" : "pointer-events-none opacity-45"}`}>
            {gifts.map((g) => (
              <button
                key={g.key}
                onClick={() => count >= 6 && setGift(g.key)}
                disabled={count < 6}
                className={`flex flex-col items-center gap-2.5 rounded-[16px] border-2 py-6 transition-colors ${
                  count >= 6 && gift === g.key
                    ? "border-gold bg-gold/15"
                    : "border-line bg-card"
                } ${count >= 6 ? "hover:border-muted" : ""}`}
              >
                <g.icon size={24} className={count >= 6 && gift === g.key ? "text-gold" : "text-muted"} strokeWidth={1.8} />
                <span className="text-sm font-bold">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* الشريط السفلي */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="total-num font-num inline-block text-xl font-bold">
                {formatIQD(total)}
              </span>
              {savings > 0 && (
                <span className="font-num text-[13px] text-muted line-through">
                  {formatIQD(subtotal)}
                </span>
              )}
            </div>
            {savings > 0 && (
              <p className="font-num mt-0.5 text-[12px] font-semibold text-ok">
                وفّرت {formatIQD(savings)}
              </p>
            )}
          </div>
          <button
            onClick={order}
            disabled={count === 0}
            className="btn btn-olive magnetic !px-8 !py-3.5 text-sm active:scale-[0.97] disabled:opacity-40"
            data-strength="16"
          >
            أضف البوكس للسلة
          </button>
        </div>
      </div>
    </div>
  );
}
