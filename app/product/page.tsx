"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useRouter } from "next/navigation";
import {
  Star,
  Minus, Plus, Check, Award, ChevronDown, Share2, Send, LinkIcon, Zap, MapPin, Gift,
  Cherry, Citrus, Flower2, Cookie, Nut, Coffee as CoffeeIcon,
  Droplet, Flame, Layers, Sparkles, Sun, Droplets, Globe, Mountain,
  Filter, FlaskConical, Timer,
  ArrowLeft,
} from "lucide-react";
import { formatIQD, productFaq,
  type Coffee, type Tool,
} from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion, reduced } from "@/lib/motion";
import { useStore } from "@/lib/store";
import BagArt from "@/components/BagArt";
import { CoffeeCard, ToolCard, Stars, ToolVisual } from "@/components/Cards";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ─── أيقونات الـ Chips (SVG خطّية — بلا إيموجي) ─── */
type IconT = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
const chipIcon: Record<string, IconT> = {
  توت: Cherry, حمضيات: Citrus, أزهار: Flower2, شوكولا: Cookie, بندق: Nut,
  "قوام كامل": CoffeeIcon, كراميل: Droplet, توابل: Flame, تعقيد: Layers,
  "حلاوة نظيفة": Sparkles, طبيعية: Sun, مغسولة: Droplets,
  V60: Filter, كيمكس: FlaskConical, أيروبرس: Timer,
  إسبريسو: CoffeeIcon,
};

/* مجموعات الـ Chips الثلاث لكل محصول: نكهة → معالجة/منشأ → تحضير */
function chipGroups(c: Coffee) {
  return [
    c.notes.map((n) => ({ label: n, Icon: chipIcon[n] ?? Sparkles })),
    [
      { label: c.process, Icon: chipIcon[c.process] ?? Sun },
      { label: c.country, Icon: Globe },
      { label: c.altitude, Icon: Mountain },
    ],
    c.brew.map((b) => ({ label: b.name, Icon: chipIcon[b.name] ?? CoffeeIcon })),
  ];
}

/* مواضع الـ Chips حول الكيس (ديسكتوب) */
const chipPos = [
  { top: "10%", insetInlineStart: "6%" },
  { top: "38%", insetInlineEnd: "4%" },
  { bottom: "14%", insetInlineStart: "10%" },
];

const weights = [
  { k: "g250", label: "٢٥٠غ" },
  { k: "g500", label: "٥٠٠غ" },
  { k: "g1000", label: "١كغم" },
] as const;
type WeightKey = (typeof weights)[number]["k"];

const grinds = ["حبوب كاملة", "V60", "إسبريسو"] as const;

/* ════════════════ عرض القهوة ════════════════ */
function CoffeeView({ coffee }: { coffee: Coffee }) {
  const { coffees, tools } = useCatalog();
  const scope = useMotion();
  const router = useRouter();
  const { addToCart, showToast, recent, pushRecent } = useStore();

  const [weight, setWeight] = useState<WeightKey>("g250");
  const [grind, setGrind] = useState<(typeof grinds)[number]>("حبوب كاملة");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeChips, setActiveChips] = useState(0);
  const [mediaTone, setMediaTone] = useState(0);

  const unit = coffee.prices[weight];
  const points = Math.round((unit * qty) / 1000);

  /* شوهد مؤخراً */
  useEffect(() => {
    pushRecent(`c:${coffee.slug}`);
  }, [coffee.slug, pushRecent]);

  const share = (kind: "copy" | "wa" | "tg") => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `قهوة ${coffee.name} من خزف — ${coffee.notes.join(" · ")}`;
    if (kind === "copy") {
      navigator.clipboard?.writeText(url);
      showToast("انتسخ الرابط");
    } else if (kind === "wa")
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
    else window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
  };

  const buyNow = () => {
    addToCart(
      { slug: coffee.slug, variant: weight.toUpperCase() as "G250" | "G500" | "G1000",
        grind, name: coffee.name, meta: `${weightLabel} · ${grind}`, priceShown: unit },
      qty
    );
    router.push("/checkout/");
  };
  const weightLabel = weights.find((w) => w.k === weight)!.label;
  const groups = chipGroups(coffee);

  /* ─── الحركة ─── */
  useGSAP(
    () => {
      if (reduced()) return;
      const root = scope.current!;

      /* دخول سريع لعناصر الشراء — بلا تعطيل */
      gsap.fromTo(
        ".pv-in",
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.05 }
      );

      /* أقسام التجربة تبدّل مجموعة الـ Chips — وترجع عند الصعود */
      gsap.utils.toArray<HTMLElement>("[data-chips]", root).forEach((sec) => {
        ScrollTrigger.create({
          trigger: sec,
          start: "top 58%",
          end: "bottom 58%",
          onToggle(self) {
            if (self.isActive) setActiveChips(Number(sec.dataset.chips));
          },
        });
      });

      /* شريط الشراء الثابت يظهر بعد لوحة الشراء */
      gsap.fromTo(
        ".pv-bar",
        { yPercent: 120 },
        {
          yPercent: 0,
          duration: 0.55,
          ease: "power3.out",
          scrollTrigger: { trigger: ".pv-exp", start: "top 75%" },
        }
      );
    },
    { scope, dependencies: [coffee.slug] }
  );

  /*
   * نبضة الكيس عند تغيّر القسم — مبنية على الحاوية .bag-media
   * لا تعتمد على الـ Placeholder إطلاقاً: بدّل محتواها بـ <img src="bag.png">
   * وكل الحركات (تكبير ٣٪ + دورانن + الظل) تشتغل كما هي.
   */
  useEffect(() => {
    if (reduced()) return;
    gsap
      .timeline()
      .to(".bag-media", { scale: 1.03, rotate: 2, duration: 0.22, ease: "power2.out" })
      .to(".bag-shadow", { opacity: 0.75, scaleX: 0.92, duration: 0.22 }, "<")
      .to(".bag-media", { scale: 1, rotate: 0, duration: 0.45, ease: "power2.inOut" })
      .to(".bag-shadow", { opacity: 0.45, scaleX: 1, duration: 0.45 }, "<");

    /* الـ Chips: القديمة تختفي والجديدة تظهر */
    gsap.utils.toArray<HTMLElement>(".chip-set").forEach((set) => {
      const on = Number(set.dataset.set) === activeChips;
      gsap.to(set.children, {
        autoAlpha: on ? 1 : 0,
        y: on ? 0 : 10,
        scale: on ? 1 : 0.9,
        duration: 0.35,
        ease: on ? "back.out(1.6)" : "power2.in",
        stagger: on ? 0.07 : 0.03,
        overwrite: true,
      });
    });
  }, [activeChips]);

  const buy = () => {
    addToCart(
      {
        slug: coffee.slug,
        variant: weight.toUpperCase() as "G250" | "G500" | "G1000",
        grind,
        name: coffee.name,
        meta: `${weightLabel} · ${grind}`,
        priceShown: unit,
      },
      qty
    );
    setAdded(true);
    if (!reduced())
      gsap.fromTo(".buy-btn", { scale: 0.94 }, { scale: 1, duration: 0.4, ease: "back.out(2.5)" });
    window.setTimeout(() => setAdded(false), 1500);
  };

  const tones = ["var(--bg-alt)", `color-mix(in srgb, ${coffee.accent} 12%, var(--bg-alt))`, "var(--bg)"];
  const similar = [
    ...coffees.filter((c) => c.slug !== coffee.slug).slice(0, 3),
    ...(tools.length ? [tools[0]] : []),
  ];

  return (
    <div ref={scope} className="pb-28 pt-24 md:pt-28">
      {/* ════ القسم الأول: قرار الشراء — بلا نزول ════ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:gap-14 md:px-8">
        {/* معرض الصور — العمود الثابت عبر الصفحة */}
        <div className="md:sticky md:top-20 md:self-start">
          <div
            className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] border border-line transition-colors duration-500"
            style={{ background: tones[mediaTone] }}
          >
            {/* الـ Chips العائمة (ديسكتوب) — تتبدّل حسب القسم */}
            {groups.map((g, gi) => (
              <div key={gi} className="chip-set pointer-events-none absolute inset-0 hidden md:block" data-set={gi}>
                {g.map((ch, ci) => (
                  <span
                    key={ch.label}
                    className="absolute flex items-center gap-1.5 rounded-full border border-line bg-bg/85 px-3.5 py-1.5 text-[12px] font-bold opacity-0 shadow-sm backdrop-blur-sm"
                    style={chipPos[ci % 3]}
                  >
                    <ch.Icon size={13} className="text-accent" strokeWidth={2} />
                    {ch.label}
                  </span>
                ))}
              </div>
            ))}

            {/* حاوية الكيس — جاهزة لأي صورة PNG لاحقاً */}
            <div className="bag-media relative flex h-[70%] items-center justify-center will-change-transform">
              <BagArt className="h-full text-olive" accent={coffee.accent} latin={coffee.latin} />
            </div>
            <div
              className="bag-shadow absolute bottom-[9%] h-3 w-[38%] rounded-full bg-ink blur-md"
              style={{ opacity: 0.45 }}
            />
          </div>

          {/* مصغّرات المعرض */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {tones.map((t, i) => (
              <button
                key={i}
                onClick={() => setMediaTone(i)}
                aria-label={`صورة ${i + 1}`}
                className={`flex aspect-square items-center justify-center rounded-[14px] border transition-all ${
                  mediaTone === i ? "border-accent" : "border-line opacity-70 hover:opacity-100"
                }`}
                style={{ background: t }}
              >
                <BagArt className="h-[62%] text-olive" accent={coffee.accent} />
              </button>
            ))}
          </div>
        </div>

        {/* لوحة الشراء */}
        <div>
          <p className="pv-in font-num text-[10px] tracking-[0.35em] text-muted opacity-0">
            {coffee.latinOrigin}
          </p>
          <h1 className="pv-in mt-2 text-4xl font-bold opacity-0 md:text-5xl">
            {coffee.name}
            <span className="ms-3 text-base font-medium text-muted">{coffee.country}</span>
          </h1>

          <div className="pv-in mt-3 flex items-center gap-2.5 opacity-0">
            {coffee.soldOut && (
              <span className="rounded-full bg-accent/12 px-3 py-1 text-[11px] font-bold text-accent">نفد مؤقتاً — يرجع قريباً</span>
            )}
            {coffee.reviewsCount > 0 ? (
              <>
                <Stars value={coffee.rating} size={15} />
                <span className="font-num text-[13px] font-semibold">{coffee.rating}</span>
              </>
            ) : (
              <span className="rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-muted">محصول جديد</span>
            )}
            <span className="font-num text-[12px] text-muted">({coffee.reviewsCount} مراجعة)</span>
            {coffee.sca && (
              <span className="flex items-center gap-1.5 rounded-full bg-olive px-3 py-1 text-[11px] font-semibold text-olive-text">
                <Award size={12} /> SCA <span className="font-num">{coffee.sca}</span>
              </span>
            )}
          </div>

          <div className="pv-in mt-4 flex flex-wrap items-center gap-3 opacity-0">
            <p className="font-num text-3xl font-bold">{formatIQD(unit)}</p>
            <span className="flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-gold">
              <Gift size={12} /> +<span className="font-num">{points}</span> نقطة
            </span>
            {coffee.stockLow && (
              <span className="rounded-full bg-accent/12 px-3 py-1 text-[11px] font-bold text-accent">
                باقي <span className="font-num">{coffee.stockLow}</span> أكياس فقط
              </span>
            )}
          </div>

          {/* الوزن */}
          <div className="pv-in mt-7 opacity-0">
            <p className="mb-2.5 text-sm font-bold text-muted">الوزن</p>
            <div className="flex gap-2">
              {weights.filter((w) => coffee.prices[w.k] > 0).map((w) => (
                <button
                  key={w.k}
                  onClick={() => setWeight(w.k)}
                  className={`flex-1 rounded-[14px] border px-3 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                    weight === w.k
                      ? "border-olive bg-olive text-olive-text"
                      : "border-line bg-card hover:border-muted"
                  }`}
                >
                  {w.label}
                  <span className="font-num mt-0.5 block text-[11px] font-medium opacity-70">
                    {formatIQD(coffee.prices[w.k])}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* الطحن */}
          <div className="pv-in mt-5 opacity-0">
            <p className="mb-2.5 text-sm font-bold text-muted">الطحن</p>
            <div className="flex flex-wrap gap-2">
              {grinds.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrind(g)}
                  className={`rounded-full border px-4 py-2.5 text-[13px] font-bold transition-all duration-200 active:scale-[0.96] ${
                    grind === g
                      ? "border-accent bg-accent text-olive-text"
                      : "border-line bg-card text-muted hover:text-ink"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            {grind !== "حبوب كاملة" && (
              <p className="mt-2.5 text-[12px] font-semibold text-ok">
                نطحنها لك مضبوطة على {grind} — جاهزة للتحضير مباشرة
              </p>
            )}
            {grind === "حبوب كاملة" && (
              <p className="mt-2.5 text-[12px] text-muted">
                عندك مطحنة؟ خيار ممتاز — الطحن الطازج فرقه محسوس
              </p>
            )}
          </div>

          {/* الكمية + الإضافة */}
          <div className="pv-in mt-6 flex items-center gap-3 opacity-0">
            <div className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-3 py-2.5">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-bg-alt"
                aria-label="أنقص"
              >
                <Minus size={15} />
              </button>
              <span className="font-num w-6 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-bg-alt"
                aria-label="زد"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={buy}
              className={`buy-btn btn magnetic flex-1 !px-6 !py-4 text-[15px] transition-colors duration-300 active:scale-[0.98] ${
                added ? "!bg-ok text-olive-text" : "btn-clay"
              }`}
              data-strength="14"
            >
              {added ? "أُضيف للسلة ✓" : `أضف للسلة — ${formatIQD(unit * qty)}`}
            </button>
          </div>

          {/* المشاركة */}
          <div className="pv-in mt-5 flex items-center gap-2 opacity-0">
            <span className="text-[12px] font-semibold text-muted">شارك:</span>
            <button onClick={() => share("copy")} aria-label="نسخ الرابط" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent">
              <LinkIcon size={14} />
            </button>
            <button onClick={() => share("wa")} aria-label="واتساب" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent">
              <Share2 size={14} />
            </button>
            <button onClick={() => share("tg")} aria-label="تلغرام" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent">
              <Send size={14} />
            </button>
          </div>

          <p className="pv-in mt-4 text-[12px] text-muted opacity-0">
            توصيل ١–٢ يوم لكل المحافظات · دفع عند الاستلام
          </p>
        </div>
      </section>

      {/* ════ القسم الثاني: التجربة — الكيس ثابت والمحتوى يتبدّل ════ */}
      <section className="pv-exp mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:gap-14 md:px-8">
        <div className="hidden md:block" />
        <div className="space-y-12 pt-14 md:pt-20">
          {/* ١) النكهة */}
          <div data-chips="0" className="reveal">
            <p className="font-num mb-3 text-[10px] tracking-[0.35em] text-muted">FLAVOR</p>
            <h2 className="text-2xl font-bold">إيحاءات النكهة</h2>
            <p className="mt-3 text-[15px] leading-[2.1] text-muted">{coffee.desc}</p>
            {/* Chips داخل القسم — موبايل */}
            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              {groups[0].map((ch) => (
                <span key={ch.label} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-[12px] font-bold">
                  <ch.Icon size={13} className="text-accent" /> {ch.label}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-bold" style={{ color: coffee.accent }}>
              {coffee.trigger}
            </p>
          </div>

          {/* ٢) المعالجة والمنشأ */}
          <div data-chips="1" className="reveal">
            <p className="font-num mb-3 text-[10px] tracking-[0.35em] text-muted">ORIGIN</p>
            <h2 className="text-2xl font-bold">المعالجة والمنشأ</h2>
            <div className="mt-4 flex flex-wrap gap-2 md:hidden">
              {groups[1].map((ch) => (
                <span key={ch.label} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-[12px] font-bold">
                  <ch.Icon size={13} className="text-accent" /> {ch.label}
                </span>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { l: "المعالجة", v: coffee.process },
                { l: "المنطقة", v: coffee.region },
                { l: "الارتفاع", v: coffee.altitude },
                { l: "السلالة", v: coffee.variety },
                { l: "التحميص", v: coffee.roast },
                { l: "الدولة", v: coffee.country },
              ].map((s) => (
                <div key={s.l} className="rounded-[14px] border border-line bg-card px-4 py-3.5">
                  <p className="text-[11px] text-muted">{s.l}</p>
                  <p className="mt-1 text-sm font-bold">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ٣) طرق التحضير → صفحة الوصفات المتخصصة */}
          <Link href="/recipes/"
            className="reveal flex items-center justify-between rounded-[20px] border border-line bg-card px-6 py-5 transition-all hover:-translate-y-0.5">
            <span>
              <span className="block text-[15px] font-bold">شلون أحضّرها؟</span>
              <span className="mt-0.5 block text-[12px] text-muted">وصفات V60 والإسبريسو والفرنش برس خطوة بخطوة</span>
            </span>
            <ArrowLeft size={17} className="text-accent" />
          </Link>
        </div>
      </section>

      {/* ════ اشترها معاً ════ */}
      <BoughtTogether coffee={coffee} />

      {/* ════ المراجعات — حقيقية من القاعدة ════ */}
      <ReviewsSection slug={coffee.slug} rating={coffee.rating} count={coffee.reviewsCount} />

      {/* ════ قد يعجبك أيضاً ════ */}
      <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
        <h2 className="reveal text-2xl font-bold md:text-3xl">قد يعجبك أيضاً</h2>
        <div className="reveal-group mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {similar.map((item) =>
            "prices" in item ? (
              <CoffeeCard key={item.slug} coffee={item as Coffee} />
            ) : (
              <ToolCard key={item.slug} tool={item as Tool} />
            )
          )}
        </div>
      </section>

      {/* ════ الأسئلة الشائعة ════ */}
      <Faq />

      {/* ════ شاهدتها مؤخراً ════ */}
      <RecentlyViewed current={coffee.slug} />

      {/* ════ شريط الشراء الثابت ════ */}
      <div className="pv-bar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {coffee.name} · {weightLabel} · {grind}
            </p>
            <p className="font-num text-[13px] text-muted">{formatIQD(unit * qty)}</p>
          </div>
          <button
            onClick={buy}
            className={`btn shrink-0 !px-7 !py-3 text-sm transition-colors duration-300 active:scale-[0.97] ${
              added ? "!bg-ok text-olive-text" : "btn-clay"
            }`}
          >
            {added ? "✓ أُضيف" : "أضف للسلة"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ اشترها معاً ════════════════ */
function BoughtTogether({ coffee }: { coffee: Coffee }) {
  const { tools } = useCatalog();
  const { addToCart } = useStore();
  const combo0 = ["v60-dripper", "paper-filters", "glass-server"]
    .map((sl) => tools.find((t) => t.slug === sl))
    .filter(Boolean) as Tool[];
  if (combo0.length < 3) return null; // الأدوات مُوقَفة حالياً
  const combo = combo0;
  const total = coffee.prices.g250 + combo.reduce((s, t) => s + t.price, 0);

  const addAll = () => {
    addToCart({ slug: coffee.slug, variant: "G250", grind: "حبوب كاملة", name: coffee.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: coffee.prices.g250 });
    combo.forEach((t) => addToCart({ slug: t.slug, variant: "PIECE", name: t.name, priceShown: t.price }, 1, true));
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
      <h2 className="reveal text-2xl font-bold md:text-3xl">اشترها معاً</h2>
      <p className="reveal mt-1 text-[13px] text-muted">كوب V60 كامل من أول طلب</p>
      <div className="reveal mt-6 rounded-[22px] border border-line bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
          <span className="rounded-full bg-bg-alt px-4 py-2">{coffee.name} ٢٥٠غ</span>
          {combo.map((t) => (
            <span key={t.slug} className="flex items-center gap-2">
              <Plus size={13} className="text-muted" />
              <span className="rounded-full bg-bg-alt px-4 py-2">{t.name}</span>
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="text-[12px] text-muted">إجمالي المجموعة</p>
            <p className="font-num text-xl font-bold">{formatIQD(total)}</p>
          </div>
          <button onClick={addAll} className="btn btn-clay !px-7 !py-3.5 text-sm active:scale-[0.97]">
            أضف الكل للسلة
          </button>
        </div>
      </div>
    </section>
  );
}

/* ════════════════ شاهدتها مؤخراً ════════════════ */
function RecentlyViewed({ current }: { current: string }) {
  const { coffees, tools } = useCatalog();
  const { recent } = useStore();
  const items = recent
    .filter((id) => id !== `c:${current}`)
    .map((id) => {
      const [k, slug] = id.split(":");
      return k === "c"
        ? coffees.find((c) => c.slug === slug)
        : tools.find((t) => t.slug === slug);
    })
    .filter(Boolean)
    .slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
      <h2 className="reveal text-2xl font-bold">شاهدتها مؤخراً</h2>
      <div className="reveal-group mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {items.map((item) =>
          item && "prices" in item ? (
            <CoffeeCard key={item.slug} coffee={item} />
          ) : item ? (
            <ToolCard key={item.slug} tool={item} />
          ) : null
        )}
      </div>
    </section>
  );
}

/* ════════════════ الأسئلة الشائعة ════════════════ */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20 md:px-8">
      <h2 className="reveal text-2xl font-bold md:text-3xl">أسئلة شائعة</h2>
      <div className="reveal mt-8 divide-y divide-line rounded-[20px] border border-line bg-card">
        {productFaq.map((f, i) => (
          <div key={f.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-5 text-start"
            >
              <span className="text-[15px] font-bold">{f.q}</span>
              <ChevronDown
                size={17}
                className={`shrink-0 text-muted transition-transform duration-300 ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: open === i ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-loose text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ════════════════ عرض الأداة ════════════════ */
function ToolView({ tool }: { tool: Tool }) {
  const { tools } = useCatalog();
  const scope = useMotion();
  const { addToCart, pushRecent } = useStore();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    pushRecent(`t:${tool.slug}`);
  }, [tool.slug, pushRecent]);

  const buy = () => {
    addToCart({ slug: tool.slug, variant: "PIECE", name: tool.name, priceShown: tool.price }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  const similar = tools
    .filter((t) => t.slug !== tool.slug && t.cats.some((c) => tool.cats.includes(c)))
    .slice(0, 4);

  return (
    <div ref={scope} className="pb-20 pt-24 md:pt-28">
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:gap-14 md:px-8">
        <ToolVisual tool={tool} className="aspect-square rounded-[24px] border border-line" />
        <div>
          <p className="text-sm text-muted">
            {tool.type} · {tool.cats.join(" و ")}
          </p>
          <h1 className="mt-1 text-4xl font-bold">{tool.name}</h1>
          <div className="mt-3 flex items-center gap-2.5">
            <Stars value={tool.rating} size={15} />
            <span className="font-num text-[12px] text-muted">({tool.reviewsCount})</span>
          </div>
          <p className="font-num mt-4 text-3xl font-bold">{formatIQD(tool.price)}</p>
          <p className="mt-5 max-w-md text-[15px] leading-loose text-muted">{tool.desc}</p>

          {tool.soldOut ? (
            <div className="mt-7 rounded-[18px] border border-line bg-card p-5">
              {notified ? (
                <p className="flex items-center gap-2 text-sm font-bold text-ok">
                  <Check size={16} /> تمام — ننبهك أول ما يرجع «{tool.name}»
                </p>
              ) : (
                <>
                  <p className="text-sm font-bold">نفد حالياً — نبّهك عند التوفر؟</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="بريدك الإلكتروني"
                      dir="ltr"
                      className="w-full rounded-[12px] border border-line bg-bg px-4 py-3 text-end text-sm outline-none focus:border-gold"
                    />
                    <button
                      onClick={() => notifyEmail.includes("@") && setNotified(true)}
                      className="btn shrink-0 !px-6 !py-3 text-sm text-olive"
                      style={{ background: "var(--gold)" }}
                    >
                      نبّهني
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-3 py-2.5">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt" aria-label="أنقص">
                <Minus size={15} />
              </button>
              <span className="font-num w-6 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt" aria-label="زد">
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={buy}
              className={`btn magnetic flex-1 !px-6 !py-4 text-[15px] active:scale-[0.98] ${
                added ? "!bg-ok text-olive-text" : "btn-clay"
              }`}
              data-strength="14"
            >
              {added ? "أُضيف ✓" : `أضف للسلة — ${formatIQD(tool.price * qty)}`}
            </button>
          </div>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted">
            <Check size={13} className="text-ok" /> دفع عند الاستلام · توصيل لكل المحافظات
          </p>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
          <h2 className="reveal text-2xl font-bold">قد يعجبك أيضاً</h2>
          <div className="reveal-group mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {similar.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ════════════════ الموجّه ════════════════ */
function ProductInner() {
  const { coffees, tools } = useCatalog();
  const params = useSearchParams();
  const t = params.get("t");
  const c = params.get("c") ?? "kaldi";

  if (t) {
    const tool = tools.find((x) => x.slug === t);
    if (tool) return <ToolView tool={tool} key={t} />;
  }
  const coffee = coffees.find((x) => x.slug === c) ?? coffees[0];
  return <CoffeeView coffee={coffee} key={coffee.slug} />;
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProductInner />
    </Suspense>
  );
}

/* ════════════════ المراجعات الحقيقية ════════════════ */
function ReviewsSection({ slug, rating, count }: { slug: string; rating: number; count: number }) {
  const { showToast } = useStore();
  const [list, setList] = useState<{ id: number; name: string; rating: number; comment: string | null; verified: boolean; reply: string | null; createdAt: string }[]>([]);
  const [form, setForm] = useState({ rating: 5, comment: "", name: "" });
  const [sending, setSending] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/?slug=${slug}`).then((r) => r.json()).then((d) => setList(d.reviews ?? [])).catch(() => {});
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await fetch("/api/reviews/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...form }),
      });
      const d = await r.json();
      if (!r.ok) showToast(d.error ?? "تعذّر الإرسال");
      else { setThanks(true); showToast(d.message); }
    } catch { showToast("تعذّر الاتصال"); }
    setSending(false);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="reveal text-2xl font-bold md:text-3xl">المراجعات</h2>
        {count > 0 && (
          <span className="flex items-center gap-2 text-sm font-bold">
            <Stars value={rating} size={15} /> <span className="font-num">{rating}</span>
            <span className="font-num text-[12px] text-muted">({count})</span>
          </span>
        )}
      </div>

      {list.length === 0 ? (
        <p className="reveal mt-6 rounded-[18px] border border-dashed border-line px-6 py-8 text-center text-sm text-muted">
          محصول جديد — كن أول من يشاركنا رأيه بعد التجربة
        </p>
      ) : (
        <div className="reveal-group mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <div key={r.id} className="rounded-[18px] border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {r.name}
                  {r.verified && (
                    <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-bold text-ok">شراء موثّق</span>
                  )}
                </span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="mt-3 text-sm leading-relaxed text-muted">{r.comment}</p>}
              {r.reply && (
                <p className="mt-3 rounded-[12px] bg-bg-alt px-4 py-2.5 text-[12px] leading-relaxed">
                  <b>رد خزف:</b> {r.reply}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* نموذج التقييم */}
      {!thanks && (
        <form onSubmit={submit} className="reveal mt-8 rounded-[20px] border border-line bg-card p-6">
          <p className="text-sm font-bold">قيّم تجربتك</p>
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} نجوم`}>
                <Star size={22} className={n <= form.rating ? "fill-gold text-gold" : "text-line"} />
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="اسمك (اختياري)"
              className="rounded-[12px] border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-accent" />
            <input value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="شنو حبيت بيها؟ (اختياري)"
              className="rounded-[12px] border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-accent" />
          </div>
          <button disabled={sending} className="btn btn-olive mt-4 !px-7 !py-3 text-sm disabled:opacity-50">
            {sending ? "…" : "أرسل التقييم"}
          </button>
          <p className="mt-2.5 text-[11px] text-muted">التقييم متاح لزبائن خزف · يُنشر بعد مراجعة سريعة</p>
        </form>
      )}
    </section>
  );
}
