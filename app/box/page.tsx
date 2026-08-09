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
import { useStore, useSiteConfig } from "@/lib/store";
import CompleteCart from "@/components/CompleteCart";
import BagArt from "@/components/BagArt";

const tiers = [
  { n: "٢", label: "خصم ٤٪" },
  { n: "٣", label: "خصم ١٢٪ + ملعقة", gold: false },
  { n: "٤", label: "خصم ٢٠٪ + كوب", gold: true },
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
    <div className="mx-auto max-w-3xl px-4 pt-24 md:px-6 md:pt-28">
      <h1 className="text-[25px] font-bold md:text-3xl">اصنع صندوقك</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        اختر محاصيلك — كل كيس تضيفه يكبّر مكافأتك، حتى كيس مجاني بالسادس.
      </p>
      {/* الخطوات مطوية — لمن يريد التفاصيل */}
      <details className="mt-4 border-y border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[13px] font-bold">
          كيف يعمل الصندوق؟
          <span className="text-[16px] font-normal text-muted">+</span>
        </summary>
        <div className="space-y-3 pb-4">
          {steps.map((st) => (
            <div key={st.n} className="flex gap-3">
              <span className="font-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-olive text-[13px] font-bold text-olive-text">{st.n}</span>
              <div>
                <p className="text-[13.5px] font-bold">{st.h}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{st.p}</p>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function hintFor(count: number): string {
  if (count === 0) return "ابدأ بأول كيس — كل كيس يقرّبك لمكافأة";
  if (count === 1) return "كيس واحد بعد… وخصم ٤٪ صار لك";
  if (count === 2) return "خصم ٤٪ فعّال · كيس ثالث يرفعه إلى ١٢٪ مع ملعقة";
  if (count === 3) return "خصم ١٢٪ والملعقة لك · كيس رابع = ٢٠٪ مع كوب";
  return "خصم ٢٠٪ والكوب لك — أعلى مستوى";
}

const discountFor = (c: number) => (c >= 4 ? 0.2 : c >= 3 ? 0.12 : c >= 2 ? 0.04 : 0);
// تقريب لأعلى 250 (نفس منطق الطلب والسلة) — الزبون يرى النسبة، والحساب مقرّب
const roundUp250 = (n: number) => Math.ceil(Math.max(0, n) / 250) * 250;

export default function BoxPage() {
  const scope = useMotion();
  const router = useRouter();
  const { addToCart, showToast, setBoxGiftChoice } = useStore();
  const { coffees, boxGifts } = useCatalog();
  const config = useSiteConfig();
  const gifts = boxGifts.map((g, i) => ({ ...g, key: g.name, icon: GIFT_ICONS[i % GIFT_ICONS.length] }));
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
  const CAP = config.boxDiscountCap ?? 20000;
  // الخصم مسقوف — لا يتجاوز CAP مهما زاد العدد
  const rawSaving = Math.round(subtotal * discount);
  const capped = Math.min(rawSaving, CAP);
  const total = roundUp250(subtotal - capped);
  // التوفير المعروض = الفرق الفعلي بعد التقريب — لا رقم نظري
  const savings = subtotal - total;

  /* المكسب من الكيس التالي — يحفّز الإضافة بأرقام حقيقية */
  const nextGain = useMemo(() => {
    if (count === 0 || coffees.length === 0) return null;
    const targets = [3, 4, 5, 6].filter((t) => t > count);
    if (targets.length === 0) return null;
    const target = targets[0];
    const need = target - count;
    /* المكسب الحقيقي = الخصم الإضافي على ما في صندوقك الآن.
       لا نحسب خصم الكيس الجديد لأن الزبون يدفع ثمنه — ذلك ليس ربحاً. */
    // مكسب حقيقي: نحسب الإجمالي المستقبلي فعلياً بنفس التقريب
    const avg = subtotal / Math.max(1, count);
    const nextSubtotal = subtotal + avg * need;
    const nextCapped = Math.min(Math.round(nextSubtotal * discountFor(target)), CAP);
    const nextTotal = roundUp250(nextSubtotal - nextCapped);
    const extraSaving = Math.max(0, (nextSubtotal - nextTotal) - savings);
    const perk = target === 5 ? "توصيل مجاني" : target === 6 ? "هديتك المجانية" : null;
    return { need, target, extraSaving, perk };
  }, [count, subtotal, savings, coffees.length]);

  /* بوكس جاهز — لمن لا يريد الاختيار */
  const fillReady = () => {
    const avail = coffees.filter((c) => !c.soldOut);
    if (avail.length === 0) return;
    const next: Record<string, number> = {};
    // نوزّع ٤ أكياس على المحاصيل المتاحة (أعلى مستوى خصم)
    for (let i = 0; i < 4; i++) {
      const c = avail[i % avail.length];
      next[c.slug] = (next[c.slug] ?? 0) + 1;
    }
    setBags(next);
    showToast("جهّزنا لك بوكساً متنوّعاً — عدّله كما تحب");
  };

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
    setBoxGiftChoice(gifts.find((g) => g.key === gift)?.name ?? null);
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
          {count >= 2 && (
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
          {/* المستويات كصفّ واحد */}
          <div className="mt-4 flex gap-px overflow-hidden rounded-[12px] bg-line">
            {tiers.map((t, i) => {
              const on = count >= i + 2;
              return (
                <div key={t.n} className={`flex-1 px-2 py-3 text-center transition-colors ${
                  on ? (t.gold ? "bg-gold text-olive" : "bg-olive text-olive-text") : "bg-card text-muted"
                }`}>
                  <p className="font-num text-[14px] font-bold">{t.n}</p>
                  <p className="mt-0.5 text-[9.5px] font-semibold leading-tight">{t.label}</p>
                </div>
              );
            })}
          </div>

          {/* سطر واحد: التوفير أو المكسب التالي */}
          {savings > 0 ? (
            <p className="mt-3 text-[13px] font-bold text-ok">
              وفّرت <span className="font-num">{formatIQD(savings)}</span> حتى الآن
              {nextGain && nextGain.extraSaving > 0 && (
                <span className="font-normal text-muted">
                  {" — "}أضِف <span className="font-num">{nextGain.need}</span>
                  {nextGain.need === 1 ? " كيساً" : " أكياس"} وتربح{" "}
                  <span className="font-num font-bold text-clay">{formatIQD(nextGain.extraSaving)}</span> إضافية
                </span>
              )}
            </p>
          ) : (
            <p className="mt-3 text-[12.5px] font-semibold text-muted">{hintFor(count)}</p>
          )}
          </div>
        </div>

        {/* بوكس جاهز — لمن لا يريد الاختيار */}
        {count === 0 && (
          <button onClick={fillReady}
            className="reveal mt-7 flex w-full items-center justify-between gap-3 rounded-[16px] border border-gold/35 bg-gold/8 p-5 text-start transition-all active:scale-[0.99]">
            <div>
              <p className="text-[13.5px] font-bold">لا تعرف أيّها تختار؟</p>
              <p className="mt-0.5 text-[11.5px] text-muted">نجهّز لك صندوقاً متنوّعاً من ٤ أكياس بخصم ٢٠٪</p>
            </div>
            <span className="btn btn-clay shrink-0 !px-5 !py-2.5 text-[12.5px]">جهّزه لي</span>
          </button>
        )}

        {/* شريط التوصيل المجاني */}
        {count > 0 && config.freeDeliveryThreshold > 0 && (() => {
          const remaining = config.freeDeliveryThreshold - total;
          return remaining > 0 ? (
            <div className="reveal mt-4 rounded-[14px] border border-line bg-card p-4">
              <p className="text-[13px] font-semibold">
                باقي لك <span className="font-num text-accent">{formatIQD(remaining)}</span> ويصير التوصيل مجانياً
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg-alt">
                <div className="h-full rounded-full bg-clay transition-all duration-500"
                  style={{ width: `${Math.min(100, (total / config.freeDeliveryThreshold) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[11.5px] text-muted">أضِف كوباً أو فلاتر لتبلغها</p>
            </div>
          ) : (
            <p className="reveal mt-4 rounded-[14px] bg-ok/10 px-4 py-3 text-[13px] font-bold text-ok">
              توصيل مجاني ✓
            </p>
          );
        })()}

        {/* المحاصيل */}
        <div className="reveal-group mt-8 space-y-4">
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
          count >= 3 ? "border-gold/50 bg-gold/10" : "border-line bg-card"
        }`}>
          <Gift size={26} className={`mx-auto ${count >= 3 ? "text-gold" : "text-muted/50"}`} />
          <h2 className={`mt-3 text-xl font-bold ${count >= 3 ? "" : "text-muted"}`}>
            {count >= 3 ? "اختر هديتك" : "هديتك المجانية"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {count >= 4
              ? "أربعة أكياس — الكوب علينا"
              : count >= 3
                ? "ثلاثة أكياس — الملعقة علينا · وبالرابع كوب"
                : `أضف ${3 - count} ${3 - count === 1 ? "كيساً" : "أكياس"} لتفتح هديتك`}
          </p>
          <div className={`mt-6 grid grid-cols-2 gap-3 transition-opacity ${count >= 3 ? "" : "pointer-events-none opacity-45"}`}>
            {gifts.map((g) => {
              // الملعقة تُفتح من ٣ أكياس · الكوب من ٤
              const needed = /كوب/.test(g.name) ? 4 : 3;
              const unlocked = count >= needed;
              const picked = unlocked;   // الهدية تُمنح تلقائياً عند بلوغ العدد
              return (
              <button
                key={g.key}
                onClick={() => count >= 3 && setGift(g.key)}
                disabled={count < 6}
                className={`flex flex-col items-center gap-2 overflow-hidden rounded-[16px] border-2 p-3 transition-colors ${
                  picked ? "border-gold bg-gold/15" : "border-line bg-card"
                } ${count >= 3 ? "hover:border-muted" : ""}`}
              >
                {g.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image} alt={g.name}
                    className="aspect-square w-full rounded-[11px] bg-white object-contain" />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center rounded-[11px] bg-bg-alt">
                    <g.icon size={26} className={picked ? "text-gold" : "text-muted"} strokeWidth={1.8} />
                  </span>
                )}
                <span className="text-[13.5px] font-bold leading-tight">{g.name}</span>
                {g.price != null && (
                  <span className="font-num text-[11.5px] text-muted line-through">{formatIQD(g.price)}</span>
                )}
                <span className={`text-[11px] ${unlocked ? "text-muted" : "font-bold text-accent"}`}>
                  {unlocked ? (g.note ?? "") : `من ${needed === 4 ? "٤" : "٣"} أكياس`}
                </span>
              </button>
              );
            })}
          </div>
        </div>
      </div>

      {count > 0 && <div className="mx-auto max-w-3xl px-4 md:px-6"><CompleteCart subtotal={total} compact /></div>}

      {/* الملخّص الشفاف — قبل الإضافة بلا مفاجآت */}
      {count > 0 && (
        <div className="mx-auto mt-10 max-w-3xl px-4 md:px-6">
          <div className="rounded-[18px] bg-bg-alt p-5">
            <div className="flex justify-between py-1.5 text-[13px]">
              <span className="text-muted">{count} {count === 1 ? "كيس" : "أكياس"}</span>
              <span className="font-num">{formatIQD(subtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between py-1.5 text-[13px] text-ok">
                <span>خصم البوكس {Math.round(discount * 100)}٪</span>
                <span className="font-num">−{formatIQD(savings)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 text-[13px]">
              <span className="text-muted">التوصيل</span>
              <span className={count >= 5 ? "font-semibold text-ok" : "font-num text-muted"}>
                {count >= 5 ? "مجاني" : "يُحسب بالسلة"}
              </span>
            </div>
            {gift && count >= 3 && (
              <div className="flex justify-between py-1.5 text-[13px] text-gold">
                <span>هديتك</span>
                <span className="font-semibold">{gift}</span>
              </div>
            )}
            <div className="my-2.5 h-px bg-line" />
            <div className="flex justify-between text-[16px] font-bold">
              <span>الإجمالي</span>
              <span className="font-num">{formatIQD(total)}</span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              وتكسب <span className="font-num font-bold text-clay">{formatIQD(Math.round(total / 1000) * 30)}</span> كاش باك من هذا الطلب
            </p>
          </div>
        </div>
      )}

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
