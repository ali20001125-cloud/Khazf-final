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
  ArrowLeft, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatIQD, productFaq, faqGeneral,
  type Coffee, type Tool,
} from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion, reduced } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { fbTrack } from "@/lib/fbpixel";
import { fmtDate } from "@/lib/datetime";
import ProductJsonLd from "@/components/ProductJsonLd";
import LeadCapture from "@/components/LeadCapture";
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

/* ════════════════ عرض القهوة — مبني للقرار السريع ════════════════ */
function CoffeeView({ coffee }: { coffee: Coffee }) {
  const { coffees, tools } = useCatalog();
  const scope = useMotion();
  const router = useRouter();
  const { addToCart, showToast, pushRecent } = useStore();

  const [weight, setWeight] = useState<WeightKey>("g250");
  const [grind, setGrind] = useState<string>("حبوب كاملة");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  // لو الوزن المختار غير متاح، نرجع لأول وزن متاح
  const safeWeight = (coffee.prices[weight] ?? 0) > 0
    ? weight
    : (weights.find((w) => (coffee.prices[w.k] ?? 0) > 0)?.k ?? "g250");
  const unit = coffee.prices[safeWeight] || coffee.prices.g250;
  const weightLabel = weights.find((w) => w.k === safeWeight)!.label;
  const cashback = Math.round((unit * qty) / 1000) * 30;

  const gallery = (coffee.images?.length ? coffee.images : coffee.image ? [coffee.image] : []) as string[];
  const grindOptions = ["حبوب كاملة", "V60 / فلتر", "إسبريسو"];

  // الصفر أو الفارغ يعني «الوزن غير متاح» — لا يُعرض
  const availableWeights = weights.filter((w) => (coffee.prices[w.k] ?? 0) > 0);

  useEffect(() => {
    pushRecent(`c:${coffee.slug}`);
    fbTrack("ViewContent", {
      content_name: coffee.name, content_ids: [coffee.slug],
      content_type: "product", value: coffee.prices.g250, currency: "IQD",
    });
  }, [coffee.slug, pushRecent, coffee.name, coffee.prices.g250]);

  /* الشريط السفلي يظهر عند اختفاء زر الشراء */
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const item = () => ({
    slug: coffee.slug,
    variant: weight.toUpperCase() as "G250" | "G500" | "G1000",
    grind, name: coffee.name,
    meta: `${weightLabel} · ${grind}`,
    priceShown: unit,
  });

  const add = () => {
    if (coffee.soldOut) return;
    addToCart(item(), qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  /* تاريخ التحميص — يظهر ٣٠ يوماً */
  const roastFresh = (() => {
    if (!coffee.roastedOn) return null;
    const days = Math.floor((Date.now() - new Date(coffee.roastedOn).getTime()) / 864e5);
    return days >= 0 && days <= 30 ? fmtDate(coffee.roastedOn) : null;
  })();

  /* ترقية البوكس — كم يوفّر لو أضاف كيسين */
  const boxGain = Math.round(unit * 3 * 0.1);

  const similar = coffees.filter((c) => c.slug !== coffee.slug && !c.soldOut).slice(0, 3);

  return (
    <div ref={scope} className="pb-28 pt-28 md:pt-32">
      <ProductJsonLd
        name={coffee.name}
        description={coffee.trigger || coffee.story || undefined}
        image={gallery[0]}
        slug={`c:${coffee.slug}`}
        price={coffee.prices.g250}
        inStock={!coffee.soldOut}
        rating={coffee.rating || undefined}
        reviewsCount={coffee.reviewsCount || undefined}
        faq={[
          ...(coffee.country ? [{ q: `من أين ${coffee.name}؟`, a: `محصول من ${coffee.country}${coffee.region ? ` — منطقة ${coffee.region}` : ""}.` }] : []),
          ...(coffee.roast ? [{ q: `ما درجة تحميص ${coffee.name}؟`, a: `تحميص ${coffee.roast}.` }] : []),
          ...(coffee.notes?.length ? [{ q: `ما نكهات ${coffee.name}؟`, a: coffee.notes.join("، ") + "." }] : []),
        ]}
      />

      <div className="mx-auto max-w-lg px-4 md:max-w-5xl md:px-8">
        <div className="md:grid md:grid-cols-2 md:gap-12">

          {/* ═══ الصورة ═══ */}
          <div className="md:sticky md:top-24 md:self-start">
            <div className="relative overflow-hidden rounded-[18px] border border-line bg-white">
              {gallery.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gallery[imgIdx] ?? gallery[0]} alt={coffee.name}
                  className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-bg-alt text-[13px] text-muted">
                  {coffee.name}
                </div>
              )}
              {coffee.soldOut && (
                <span className="absolute end-3 top-3 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-white">
                  نفد مؤقتاً
                </span>
              )}
              {gallery.length > 1 && (
                <span className="font-num absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-2.5 py-1 text-[10.5px] font-bold text-cream">
                  {imgIdx + 1} / {gallery.length}
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-2.5 flex gap-2">
                {gallery.slice(0, 4).map((src, i) => (
                  <button key={src + i} onClick={() => setImgIdx(i)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-[10px] border-2 transition-all ${
                      i === imgIdx ? "border-clay" : "border-line opacity-70"
                    }`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full bg-card object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ═══ القرار — كل ما يحتاجه بلا نزول ═══ */}
          <div className="mt-5 md:mt-0">
            <p className="font-num text-[10px] tracking-[0.28em] text-muted">
              {(coffee.latin || coffee.country || "").toUpperCase()}
            </p>
            <h1 className="mt-1.5 font-[Amiri,serif] text-[30px] font-bold leading-tight md:text-[35px]">{coffee.name}</h1>
            <p className="mt-1 text-[12.5px] text-muted">
              {[coffee.country, coffee.region, coffee.roast && `تحميص ${coffee.roast}`].filter(Boolean).join(" · ")}
            </p>

            {coffee.notes?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {coffee.notes.map((n) => (
                  <span key={n} className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold"
                    style={{ color: coffee.accent }}>{n}</span>
                ))}
              </div>
            )}

            {roastFresh && (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-ok">
                <Flame size={13} /> تحميص حديث · {roastFresh}
              </p>
            )}

            {coffee.reviewsCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Stars value={coffee.rating} size={14} />
                <span className="font-num text-[12px] font-semibold">{coffee.rating}</span>
                <span className="font-num text-[11.5px] text-muted">({coffee.reviewsCount})</span>
              </div>
            )}

            {coffee.trigger && (
              <p className="mt-4 border-s-2 border-clay/40 ps-3.5 text-[14.5px] leading-relaxed">
                {coffee.trigger}
              </p>
            )}

            {/* الوزن */}
            <p className="mb-2 mt-6 text-[11.5px] font-bold text-muted">الوزن</p>
            <div className="flex gap-2">
              {availableWeights.map((w) => (
                <button key={w.k} onClick={() => setWeight(w.k)}
                  className={`flex-1 rounded-[13px] border py-2.5 text-center transition-all active:scale-[0.97] ${
                    safeWeight === w.k ? "border-clay bg-clay/8" : "border-line bg-card"
                  }`}>
                  <span className="block text-[13px] font-bold">{w.label}</span>
                  <span className="font-num mt-0.5 block text-[11px] text-muted">
                    {formatIQD(coffee.prices[w.k]!)}
                  </span>
                </button>
              ))}
            </div>

            {/* الطحن */}
            <p className="mb-2 mt-5 text-[11.5px] font-bold text-muted">
              الطحن <span className="font-normal">— حسب أداتك</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {grindOptions.map((g) => (
                <button key={g} onClick={() => setGrind(g)}
                  className={`rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${
                    grind === g ? "border-clay bg-clay/8" : "border-line bg-card"
                  }`}>
                  {g}
                </button>
              ))}
            </div>

            {/* الكمية + الشراء */}
            <div ref={buyRef} className="mt-6 flex items-center gap-2.5">
              <div className="flex items-center gap-3 rounded-[13px] border border-line bg-card px-3 py-2.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="أنقص"
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt"><Minus size={15} /></button>
                <span className="font-num w-4 text-center text-[14px] font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} aria-label="زد"
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt"><Plus size={15} /></button>
              </div>
              <button onClick={add} disabled={coffee.soldOut}
                className={`btn flex-1 !py-3.5 text-[14.5px] transition-colors active:scale-[0.98] disabled:opacity-50 ${
                  added ? "!bg-ok text-olive-text" : "btn-clay"
                }`}>
                {coffee.soldOut ? "نفد مؤقتاً" : added ? "✓ أُضيف للسلة" : `أضف للسلة — ${formatIQD(unit * qty)}`}
              </button>
            </div>

            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
              توصيل ١–٢ يوم · دفع عند الاستلام · توصيل مجاني لأول طلب
              {cashback > 0 && <> · تكسب <span className="font-num font-bold text-clay">{formatIQD(cashback)}</span> كاش باك</>}
            </p>

            {/* نفد؟ نلتقط بريده */}
            {coffee.soldOut && (
              <div className="mt-5">
                <LeadCapture source="restock" productSlug={coffee.slug} productName={coffee.name} />
              </div>
            )}

            {/* ترقية البوكس */}
            {!coffee.soldOut && (
              <Link href="/box/"
                className="mt-5 flex items-center gap-3 rounded-[15px] border border-gold/35 bg-gold/7 p-4 transition-all active:scale-[0.99]">
                <Gift size={18} className="shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold leading-snug">
                    خذ ٣ أكياس ووفّر <span className="font-num text-clay">{formatIQD(boxGain)}</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">اصنع صندوقك — وبالسادس كيس مجاني</p>
                </div>
                <ArrowLeft size={15} className="shrink-0 text-gold" />
              </Link>
            )}

            {/* التفاصيل — مطويّة لمن يريد */}
            <div className="mt-7">
              <Acc title="بيانات المحصول">
                <div className="grid grid-cols-2 gap-px border border-line bg-line">
                  {[
                    ["الدولة", coffee.country],
                    ["المنطقة", coffee.region],
                    ["الارتفاع", coffee.altitude],
                    ["المعالجة", coffee.process],
                    ["التحميص", coffee.roast],
                    ["السلالة", coffee.variety],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string} className="bg-bg p-3">
                      <p className="text-[10px] text-muted">{k}</p>
                      <p className="mt-0.5 text-[12.5px] font-semibold">{v}</p>
                    </div>
                  ))}
                </div>
                {(coffee.flavorAcidity || coffee.flavorSweetness || coffee.flavorBody) && (
                  <div className="mt-4 space-y-2.5">
                    {([["حموضة", coffee.flavorAcidity], ["حلاوة", coffee.flavorSweetness], ["قوام", coffee.flavorBody]] as const)
                      .filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3">
                        <span className="w-10 text-[11.5px] text-muted">{k}</span>
                        <div className="h-[3px] flex-1 rounded-full bg-bg-alt">
                          <div className="h-full rounded-full bg-clay" style={{ width: `${((v ?? 0) / 5) * 100}%` }} />
                        </div>
                        <span className="font-num text-[11px] text-muted">{v}/٥</span>
                      </div>
                    ))}
                  </div>
                )}
              </Acc>

              {coffee.brew?.length > 0 && (
                <Acc title="كيف أحضّرها؟">
                  <div className="divide-y divide-line">
                    {coffee.brew.map((b) => (
                      <div key={b.name} className="flex items-center justify-between py-2.5">
                        <span className="text-[13px] font-bold">{b.name}</span>
                        <span className="font-num text-[12px] text-muted">{b.nums}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/guide/" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-accent">
                    دليل التحضير كاملاً <ArrowLeft size={13} />
                  </Link>
                </Acc>
              )}

              {coffee.story && (
                <Acc title="قصة المحصول">
                  <p className="text-[13px] leading-relaxed text-muted">{coffee.story}</p>
                </Acc>
              )}

              <Acc title="لماذا تثق بقهوتنا">
                <div className="space-y-3">
                  {[
                    ["تحميص حديث", "نحمّص بدفعات صغيرة متكرّرة، فلا يطول بقاء القهوة على الرف."],
                    ["صمّام أحادي", "يُخرج غازات التحميص ويمنع دخول الهواء، فتبقى النكهة كما خرجت من المحمصة."],
                    ["محدّدة المصدر", "محاصيل من مزارع نعرفها — لا خلطات مجهولة."],
                    ["طحن عند الطلب", "تختار طحنتك حسب أداتك، أو تأخذها حبوباً كاملة."],
                  ].map(([t, d]) => (
                    <div key={t}>
                      <p className="text-[13px] font-bold">{t}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{d}</p>
                    </div>
                  ))}
                </div>
              </Acc>

              <Acc title="أسئلة شائعة">
                <div className="divide-y divide-line border-y border-line">
                  {faqGeneral.slice(0, 4).map((f) => (
                    <details key={f.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[13px] font-semibold">
                        {f.q}
                        <span className="text-[15px] font-normal text-muted">+</span>
                      </summary>
                      <p className="pb-3 text-[12.5px] leading-relaxed text-muted">{f.a}</p>
                    </details>
                  ))}
                </div>
                <Link href="/faq/" className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-accent">
                  كل الأسئلة <ArrowLeft size={13} />
                </Link>
              </Acc>
            </div>
          </div>
        </div>

        {/* التقييمات */}
        <ReviewsSection slug={coffee.slug} rating={coffee.rating} count={coffee.reviewsCount} />

        {/* محاصيل أخرى */}
        {similar.length > 0 && (
          <section className="pt-14">
            <h2 className="text-[19px] font-bold">محاصيل أخرى</h2>
            <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
              {similar.map((c) => (
                <div key={c.slug} className="w-[46%] max-w-[200px] shrink-0">
                  <CoffeeCard coffee={c} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* شريط الشراء الثابت */}
      {!coffee.soldOut && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/97 backdrop-blur-md transition-transform duration-400 ${
          showBar ? "translate-y-0" : "translate-y-full"
        }`}>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-[12px] text-muted">{coffee.name} · {weightLabel} · {grind}</p>
              <p className="font-num text-[15px] font-bold">{formatIQD(unit * qty)}</p>
            </div>
            <button onClick={add}
              className={`btn shrink-0 !px-7 !py-3 text-[13.5px] active:scale-[0.97] ${
                added ? "!bg-ok text-olive-text" : "btn-clay"
              }`}>
              {added ? "✓ أُضيف" : "أضف للسلة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* عنصر طيّ بسيط */
function Acc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border-t border-line last:border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[13.5px] font-bold">
        {title}
        <span className="text-[17px] font-normal text-muted transition-transform">+</span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
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

  const ts = tool.toolSpecs ?? null;
  const colors = ts?.colors ?? [];
  const sizes = ts?.sizes ?? [];
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(0);
  const [hotspot, setHotspot] = useState<number | null>(null);
  const [showBar, setShowBar] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);

  /* خيارات المنتج (مقاس/عبوة/لون) — لكل خيار سعره ومخزونه */
  const pv = tool.variants ?? [];
  const [pvIdx, setPvIdx] = useState(() => {
    const firstAvail = pv.findIndex((v) => v.stock > 0);
    return firstAvail >= 0 ? firstAvail : 0;
  });
  const chosenVariant = pv.length > 0 ? pv[pvIdx] : null;
  const unitPrice = chosenVariant
    ? (chosenVariant.salePrice ?? chosenVariant.price ?? tool.price)
    : (tool.salePrice ?? tool.price);
  const strikePrice = chosenVariant
    ? (chosenVariant.salePrice != null ? (chosenVariant.price ?? tool.price) : null)
    : (tool.salePrice != null ? tool.price : null);
  const variantOut = chosenVariant ? chosenVariant.stock < 1 : false;

  useEffect(() => {
    pushRecent(`t:${tool.slug}`);
    fbTrack("ViewContent", {
      content_name: tool.name, content_ids: [tool.slug],
      content_type: "product", value: tool.price, currency: "IQD",
    });
  }, [tool.slug, pushRecent, tool.name, tool.price]);

  // الشريط السفلي يظهر فقط عندما يختفي زر الشراء الأصلي عن الشاشة
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // الصورة المعروضة: صورة اللون المختار إن وُجدت، وإلا الصورة الرئيسية
  const activeColor = colors[colorIdx];
  // معرض الصور: صورة اللون المختار أولاً، ثم كل صور المنتج
  const gallery = (() => {
    // صور المنتج + صور كل الخيارات (الألوان) — بلا تكرار
    const variantImgs = (tool.variants ?? []).map((v) => v.image).filter(Boolean) as string[];
    const all = [...(tool.images ?? []), ...variantImgs];
    const uniq = [...new Set(all.filter(Boolean))];
    const colorImg = activeColor?.image || chosenVariant?.image;
    if (colorImg) return [colorImg, ...uniq.filter((x) => x !== colorImg)];
    return uniq;
  })();
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => { setImgIdx(0); }, [activeColor?.image, chosenVariant?.id]);
  const heroImage = gallery[imgIdx] ?? gallery[0] ?? "";

  const buy = () => {
    addToCart({
      slug: tool.slug, variant: "PIECE", name: tool.name,
      meta: chosenVariant?.label ?? undefined,
      priceShown: unitPrice,
      variantId: chosenVariant?.id ?? null,
      variantLabel: chosenVariant?.label ?? null,
    }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  const similar = tools
    .filter((t) => t.slug !== tool.slug && t.cats.some((c) => tool.cats.includes(c)))
    .slice(0, 4);

  return (
    <div ref={scope} className="pb-28 pt-24 md:pt-28">
      <ProductJsonLd
        name={tool.name}
        description={tool.desc || ts?.hero || undefined}
        image={gallery[0]}
        slug={`t:${tool.slug}`}
        price={unitPrice}
        inStock={!tool.soldOut && !variantOut}
        rating={tool.rating || undefined}
        reviewsCount={tool.reviewsCount || undefined}
        faq={(ts?.specs ?? []).slice(0, 4).map((sp) => ({
          q: `${sp.key} — ${tool.name}؟`, a: String(sp.value),
        }))}
      />
      {/* ═ البطل: صورة + معلومات الشراء ═ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2 md:gap-14 md:px-8">
        {/* الصورة + معرض قابل للتمرير */}
        <div>
          <div className="relative">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={tool.name} className="aspect-square w-full rounded-[24px] border border-line bg-card object-contain" />
            ) : (
              <ToolVisual tool={tool} className="aspect-square rounded-[24px] border border-line" />
            )}
            {tool.type && (
              <span className="absolute right-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-[11.5px] font-bold text-ink shadow-md ring-1 ring-black/5 backdrop-blur-sm">
                {tool.type}
              </span>
            )}
            {gallery.length > 1 && (
              <>
                <button onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  aria-label="الصورة السابقة"
                  className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md ring-1 ring-black/5 transition-transform active:scale-90">
                  <ChevronRight size={18} />
                </button>
                <button onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                  aria-label="الصورة التالية"
                  className="absolute start-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md ring-1 ring-black/5 transition-transform active:scale-90">
                  <ChevronLeft size={18} />
                </button>
                <span className="font-num absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-cream">
                  {imgIdx + 1} / {gallery.length}
                </span>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2.5">
              {gallery.slice(0, 4).map((src, i) => (
                <button key={src + i} onClick={() => setImgIdx(i)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-[11px] border-2 transition-all ${
                    i === imgIdx ? "border-clay" : "border-line opacity-70 hover:opacity-100"
                  }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full bg-card object-contain" />
                </button>
              ))}
              {gallery.length > 4 && (
                <button onClick={() => setImgIdx(4)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-[11px] border-2 ${
                    imgIdx >= 4 ? "border-clay" : "border-line"
                  }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gallery[4]} alt="" className="h-full w-full bg-card object-contain blur-[1.5px]" />
                  <span className="font-num absolute inset-0 flex items-center justify-center bg-ink/55 text-[13px] font-bold text-cream">
                    +{gallery.length - 4}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          {/* البطل: الجملة الفارقة */}
          {ts?.hero ? (
            <>
              <p className="text-[12px] font-bold tracking-wide text-accent">{tool.latin || tool.name}</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{ts.hero}</h1>
              <p className="mt-3 text-[14px] leading-loose text-muted">{tool.desc}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">{tool.type} · {tool.cats.join(" و ")}</p>
              <h1 className="mt-1 text-4xl font-bold">{tool.name}</h1>
              <p className="mt-5 max-w-md text-[15px] leading-loose text-muted">{tool.desc}</p>
            </>
          )}

          {tool.reviewsCount > 0 && (
            <div className="mt-3 flex items-center gap-2.5">
              <Stars value={tool.rating} size={15} />
              <span className="font-num text-[12px] text-muted">({tool.reviewsCount})</span>
            </div>
          )}
          <div className="mt-4 flex items-baseline gap-3">
            <p className="font-num text-3xl font-bold">{formatIQD(unitPrice)}</p>
            {strikePrice != null && (
              <>
                <span className="font-num text-[15px] text-muted line-through">{formatIQD(strikePrice)}</span>
                <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-bold text-accent">
                  وفّر {formatIQD(strikePrice - unitPrice)}
                </span>
              </>
            )}
          </div>

          {/* خيارات المنتج (مقاس · عبوة · لون) */}
          {pv.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-[12px] font-bold text-muted">
                {pv[0].kind === "COLOR" ? "اللون" : pv[0].kind === "PACK" ? "العبوة" : "المقاس"}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {pv.map((v, i) => {
                  const out = v.stock < 1;
                  const active = i === pvIdx;
                  // شكل الخيار يتكيّف: صورة فقط · دائرة لون · اسم · أو مزيج
                  const showName = !v.label.startsWith("خيار ");
                  return (
                      <button key={v.id} onClick={() => !out && setPvIdx(i)} disabled={out}
                        title={v.label}
                        className={`flex items-center gap-2.5 rounded-[13px] border text-start transition-all duration-200 active:scale-[0.97] ${
                          v.image && !showName && !v.hex ? "p-1.5" : "px-3 py-2.5"
                        } ${
                          out ? "cursor-not-allowed border-line bg-bg-alt/50 opacity-50"
                          : active ? "border-clay bg-clay/8" : "border-line bg-card hover:border-muted"
                        }`}>
                        {v.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.image} alt={v.label}
                            className={`shrink-0 rounded-[9px] border border-line object-cover ${
                              showName || v.hex ? "h-9 w-9" : "h-14 w-14"
                            }`} />
                        ) : v.hex ? (
                          <span className="h-7 w-7 shrink-0 rounded-full border border-line shadow-inner"
                            style={{ background: v.hex }} />
                        ) : null}
                        {(showName || (out && !v.image)) && (
                          <span>
                            {showName && <span className="block text-[13px] font-bold">{v.label}</span>}
                            {(out || v.salePrice != null || v.price != null) && (
                              <span className="font-num mt-0.5 block text-[11.5px] text-muted">
                                {out ? "نفد" : formatIQD(v.salePrice ?? v.price ?? tool.price)}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                  );
                })}
              </div>
              {chosenVariant && chosenVariant.stock > 0 && chosenVariant.stock <= 5 && (
                <p className="mt-2 text-[11.5px] font-bold text-accent">
                  بقي {chosenVariant.stock} فقط
                </p>
              )}
            </div>
          )}

          {/* المقاسات */}
          {sizes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-[12px] font-bold text-muted">المقاس</p>
              <div className="flex flex-wrap gap-2.5">
                {sizes.map((sz, i) => (
                  <button key={i} onClick={() => setSizeIdx(i)}
                    className={`rounded-[13px] border-2 px-4 py-2.5 text-center transition-colors ${
                      sizeIdx === i ? "border-ink bg-card" : "border-line"
                    }`}>
                    <span className="block text-[14px] font-bold">{sz.label}</span>
                    {sz.sub && <span className="block text-[10.5px] text-muted">{sz.sub}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* الألوان الذكية — تبدّل الصورة */}
          {colors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2.5 text-[12px] font-bold text-muted">
                اللون{activeColor ? <span className="text-ink"> — {activeColor.name}</span> : null}
              </p>
              <div className="flex flex-wrap gap-3">
                {colors.map((c, i) => (
                  <button key={i} onClick={() => setColorIdx(i)}
                    title={c.name}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      colorIdx === i ? "border-ink ring-2 ring-ink/15" : "border-line"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* الشراء */}
          {tool.soldOut ? (
            <div className="mt-7">
              <LeadCapture source="restock" productSlug={tool.slug} productName={tool.name} />
            </div>
          ) : (
            <div ref={buyRef} className="mt-7 flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-[14px] border border-line bg-card px-3 py-2.5">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt" aria-label="أنقص"><Minus size={15} /></button>
                <span className="font-num w-6 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg-alt" aria-label="زد"><Plus size={15} /></button>
              </div>
              <button onClick={buy}
                className={`btn magnetic flex-1 !px-6 !py-4 text-[15px] active:scale-[0.98] ${added ? "!bg-ok text-olive-text" : "btn-clay"}`}
                data-strength="14">
                {added ? "أُضيف ✓" : `أضف للسلة — ${formatIQD(tool.price * qty)}`}
              </button>
            </div>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted">
            <Check size={13} className="text-ok" /> دفع عند الاستلام · توصيل لكل المحافظات
          </p>
        </div>
      </section>

      {/* ═ الميزات — لماذا هذه الأداة ═ */}
      {ts?.features && ts.features.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-16 md:px-8 md:pt-24">
          <h2 className="reveal text-center text-[13px] font-bold tracking-wide text-accent">لماذا هذه الأداة</h2>
          <div className="reveal-group mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            {ts.features.map((f, i) => (
              <div key={i} className="rounded-[18px] border border-line bg-card p-5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[13px] bg-bg text-accent">
                  <Sparkles size={19} strokeWidth={1.8} />
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold">{f.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═ الأجزاء المشروحة (نمط 2: صورة + شرح) ═ */}
      {ts?.parts && ts.parts.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pt-16 md:px-8 md:pt-24">
          <h2 className="reveal text-center text-2xl font-bold">تفاصيل تصنع الفرق</h2>
          <div className="mt-8 space-y-4">
            {ts.parts.map((part, i) => (
              <div key={i} className="reveal flex items-stretch overflow-hidden rounded-[20px] border border-line bg-card">
                {part.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={part.image} alt={part.title}
                    className="h-[104px] w-[104px] shrink-0 object-cover sm:h-auto sm:w-2/5 sm:self-auto" />
                )}
                <div className="flex flex-col justify-center p-4 sm:p-6">
                  {part.tag && <p className="text-[10.5px] font-bold tracking-wide text-accent">{part.tag}</p>}
                  <h3 className="mt-1 text-[15px] font-bold sm:text-[18px]">{part.title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted sm:text-[13px]">{part.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═ النقاط التفاعلية (نمط 3) ═ */}
      {ts?.hotspots && ts.hotspots.length > 0 && heroImage && (
        <section className="mx-auto max-w-3xl px-4 pt-16 md:px-8 md:pt-24">
          <h2 className="reveal text-center text-2xl font-bold">اكتشف كل جزء</h2>
          <div className="reveal relative mt-8 overflow-hidden rounded-[22px] border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={tool.name} className="w-full object-contain" />
            {ts.hotspots.map((h, i) => (
              <button key={i} onClick={() => setHotspot(hotspot === i ? null : i)}
                className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-all ${
                  hotspot === i ? "border-gold bg-gold text-olive" : "border-accent bg-white/90 text-accent"
                }`}
                style={{ right: `${h.x}%`, top: `${h.y}%` }}>
                {i + 1}
              </button>
            ))}
            <div className="absolute inset-x-3 bottom-3 rounded-[14px] bg-ink/92 p-4 text-cream">
              {hotspot !== null ? (
                <>
                  <p className="text-[13px] font-bold text-gold">{ts.hotspots[hotspot].title}</p>
                  <p className="mt-1 text-[12px] opacity-90">{ts.hotspots[hotspot].desc}</p>
                </>
              ) : (
                <p className="text-[12.5px] opacity-90">اضغط أي رقم على الصورة لتكتشف ميزة ذلك الجزء</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═ المواصفات ═ */}
      {ts?.specs && ts.specs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-16 md:px-8 md:pt-24">
          <h2 className="reveal text-[13px] font-bold tracking-wide text-accent">المواصفات</h2>
          <div className="reveal-group mt-6 grid grid-cols-2 gap-3">
            {ts.specs.map((sp, i) => (
              <div key={i} className="rounded-[14px] bg-card p-4">
                <p className="text-[11px] font-semibold text-muted">{sp.key}</p>
                <p className="mt-1 text-[14px] font-bold">{sp.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═ التوافق ═ */}
      {ts?.compat && ts.compat.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-14 md:px-8">
          <div className="reveal rounded-[20px] bg-olive p-6 text-olive-text md:p-7">
            <h3 className="text-[13px] font-bold text-gold">يعمل مع</h3>
            <div className="mt-3 space-y-2">
              {ts.compat.map((c, i) => (
                <p key={i} className="flex items-center gap-2.5 text-[13.5px]">
                  <Check size={15} className="shrink-0 text-gold" /> {c}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═ محتويات العبوة ═ */}
      {ts?.boxContents && ts.boxContents.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pt-14 md:px-8">
          <h2 className="reveal text-[13px] font-bold tracking-wide text-accent">في العبوة</h2>
          <div className="reveal mt-5 rounded-[18px] border border-line bg-card p-2">
            {ts.boxContents.map((item, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 text-[13.5px] last:border-0">
                <span className="font-num text-accent font-bold">١</span> {item}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═ مشابهة ═ */}
      {similar.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-20 md:px-8">
          <h2 className="reveal text-2xl font-bold">قد يعجبك أيضاً</h2>
          <div className="reveal-group mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {similar.map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
        </section>
      )}

      {/* شريط الشراء الثابت — يظهر فقط عند اختفاء زر الشراء الأصلي */}
      {!tool.soldOut && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md transition-transform duration-500 ${
          showBar ? "translate-y-0" : "translate-y-full"
        }`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 md:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {tool.name}{chosenVariant ? ` · ${chosenVariant.label}` : activeColor ? ` · ${activeColor.name}` : ""}
              </p>
              <p className="font-num text-[13px] text-muted">{formatIQD(unitPrice * qty)}</p>
            </div>
            <button onClick={buy} disabled={variantOut}
              className={`btn shrink-0 !px-7 !py-3 text-sm transition-colors duration-300 active:scale-[0.97] disabled:opacity-50 ${
                added ? "!bg-ok text-olive-text" : "btn-clay"
              }`}>
              {variantOut ? "نفد" : added ? "✓ أُضيف" : "أضف للسلة"}
            </button>
          </div>
        </div>
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
  const [list, setList] = useState<{ id: number; name: string; rating: number; comment: string | null; verified: boolean; reply: string | null; createdAt: string }[]>([]);

  useEffect(() => {
    fetch(`/api/reviews/?slug=${slug}`).then((r) => r.json()).then((d) => setList(d.reviews ?? [])).catch(() => {});
  }, [slug]);

  // لا تُعرض المراجعات إن لم توجد منشورة — القسم يختفي تماماً
  if (list.length === 0 && count === 0) return null;

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

      {list.length > 0 && (
        <div className="reveal-group mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* التعليقات المكتوبة أولاً — أقوى أثراً من النجوم الصامتة */}
          {[...list].sort((a, b) => (b.comment ? 1 : 0) - (a.comment ? 1 : 0)).map((r) => (
            <div key={r.id} className="rounded-[18px] border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  {r.name?.trim() || "زبون خزف"}
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
    </section>
  );
}
