"use client";

import { useMemo, useState } from "react";
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

export default function BoxPage() {
  const scope = useMotion();
  const router = useRouter();
  const { addToCart, showToast, setBoxGiftChoice } = useStore();
  const { coffees, boxGiftNames } = useCatalog();
  const gifts = boxGiftNames.map((label, i) => ({ key: label, label, icon: GIFT_ICONS[i % GIFT_ICONS.length] }));
  const [bags, setBags] = useState<Record<string, number>>({});
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
  const total = Math.round(subtotal * (1 - discount));
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
    router.push("/cart/");
  };

  return (
    <div ref={scope} className="pb-32 pt-24 md:pt-28">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* رأس مبسّط — بلا مشاهد سينمائية */}
        <div className="text-center">
          <p className="reveal font-num text-[10px] tracking-[0.4em] text-muted">
            BUILD YOUR BOX
          </p>
          <h1 className="reveal mt-3 text-3xl font-bold md:text-4xl">اصنع بوكسك</h1>
          <p className="reveal mt-2 text-sm text-muted">
            اختر أكياسك بنفسك — والمكافأة تكبر مع كل كيس
          </p>

          {/* العدّاد */}
          <div className="mt-8">
            <span
              className={`big-count inline-block text-[80px] font-bold leading-none transition-colors duration-300 ${
                count > 0 ? "text-accent" : "text-line"
              }`}
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              {count}
            </span>
            <p className="mt-1 text-sm text-muted">{count === 1 ? "كيس" : "أكياس"}</p>
          </div>

          {/* التقدّم والمحطات */}
          <div className="mt-7 h-2 overflow-hidden rounded-full bg-bg-alt">
            <i
              className="block h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.min(count / 6, 1) * 100}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {tiers.map((t, i) => {
              const on = count >= i + 3;
              return (
                <div key={t.n} className="text-center">
                  <div
                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
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
                    className={`mt-2 text-[11px] font-semibold ${
                      on ? (t.gold ? "text-gold" : "text-accent") : "text-muted"
                    }`}
                  >
                    {t.label}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-7 inline-block rounded-full bg-bg-alt px-6 py-2.5 text-[13px] font-semibold">
            {hintFor(count)}
          </p>
        </div>

        {/* المحاصيل */}
        <div className="reveal-group mt-10 space-y-4">
          {coffees.map((c) => {
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
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] bg-bg-alt"
                >
                  <BagArt className="h-[75%] text-olive" accent={c.accent} />
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

        {/* الهدية */}
        {count >= 6 && (
          <div className="mt-10 rounded-[22px] border border-gold/50 bg-gold/10 p-6 text-center">
            <Gift size={26} className="mx-auto text-gold" />
            <h2 className="mt-3 text-xl font-bold">اختر هديتك</h2>
            <p className="mt-1 text-[13px] text-muted">وصلت لـ ٦ أكياس — هديتك علينا</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {gifts.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGift(g.key)}
                  className={`flex flex-col items-center gap-2.5 rounded-[16px] border-2 py-6 transition-colors ${
                    gift === g.key
                      ? "border-gold bg-gold/15"
                      : "border-line bg-card hover:border-muted"
                  }`}
                >
                  <g.icon size={24} className={gift === g.key ? "text-gold" : "text-muted"} strokeWidth={1.8} />
                  <span className="text-sm font-bold">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
