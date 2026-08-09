"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { useStore, useSiteConfig } from "@/lib/store";
import { fbTrack } from "@/lib/fbpixel";
import { fmtDate } from "@/lib/datetime";
import ProductJsonLd from "@/components/ProductJsonLd";
import LeadCapture from "@/components/LeadCapture";
import { infoSlides } from "@/components/InfoSlides";
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
  const { addToCart, pushRecent } = useStore();
  const config = useSiteConfig();

  const [weight, setWeight] = useState<WeightKey>("g250");
  const [grind, setGrind] = useState<string>("حبوب كاملة");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [shot, setShot] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const buyRef = useRef<HTMLDivElement>(null);

  const availableWeights = weights.filter((w) => (coffee.prices[w.k] ?? 0) > 0);
  const safeWeight = (coffee.prices[weight] ?? 0) > 0 ? weight : (availableWeights[0]?.k ?? "g250");
  const unit = coffee.prices[safeWeight] || coffee.prices.g250;
  const weightLabel = weights.find((w) => w.k === safeWeight)!.label;
  const grams = safeWeight === "g1000" ? 1000 : safeWeight === "g500" ? 500 : 250;
  const totalPrice = unit * qty;
  const cashback = Math.round(totalPrice / (config.cashbackPerAmount || 33));

  const maxQty = coffee.bagsLeft != null ? Math.max(1, Math.floor((coffee.bagsLeft * 250) / grams)) : 99;
  /* ما تبقّى من الدفعة — رقم ثابت لكل محصول بين ٥ و١٢ (ليس المخزون) */
  const batchLeft = 5 + (coffee.slug.split("").reduce((t, c) => t + c.charCodeAt(0), 0) % 8);
  const gallery = (coffee.images?.length ? coffee.images : coffee.image ? [coffee.image] : []) as string[];
  const grindOptions = ["حبوب كاملة", "V60 / فلتر", "إسبريسو"];
  const slides = infoSlides(coffee);
  const totalShots = gallery.length + slides.length;
  const n = (x: number) => x.toLocaleString("en");
  const r250 = (x: number) => Math.ceil(Math.max(0, x) / 250) * 250;
  // أرقام البوكس بعد التقريب الفعلي — تطابق ما يدفعه بالضبط
  const boxRows = ([[2, 0.04, "ملعقة إسبريسو"], [3, 0.12, "ملعقة إسبريسو"], [4, 0.2, "كوب سيراميك"]] as const)
    .map(([bags, pct, gift]) => {
      const gross = unit * bags;
      const capped = Math.min(Math.round(gross * pct), config.boxDiscountCap ?? 20000);
      const pay = r250(gross - capped);
      return { bags, gift: bags >= 3 ? gift : null, pay, save: gross - pay, gross };
    });
  const two = boxRows[0].pay;
  const arrival = new Date(Date.now() + 2 * 864e5).toLocaleDateString("ar-IQ", { weekday: "long", day: "numeric", month: "long" });

  useEffect(() => { setQty((q) => Math.min(q, maxQty)); }, [maxQty]);
  useEffect(() => {
    pushRecent(`c:${coffee.slug}`);
    fbTrack("ViewContent", { content_name: coffee.name, content_ids: [coffee.slug],
      content_type: "product", value: coffee.prices.g250, currency: "IQD" });
  }, [coffee.slug, pushRecent, coffee.name, coffee.prices.g250]);

  /* الشريط يظهر بعد تجاوز منطقة الشراء */
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const add = () => {
    if (coffee.soldOut) return;
    addToCart({ slug: coffee.slug, variant: safeWeight.toUpperCase() as "G250" | "G500" | "G1000",
      grind, name: coffee.name, meta: `${weightLabel} · ${grind}`, priceShown: unit }, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  };

  /* الطزاجة — تعرض نسبياً أو بالتاريخ أو تُخفى حسب إعداد المنتج */
  const roastAge = (() => {
    if (!coffee.roastedOn || coffee.roastDisplay === "none") return null;
    const d = Math.floor((Date.now() - new Date(coffee.roastedOn).getTime()) / 864e5);
    if (d < 0 || d > 45) return null;
    if (coffee.roastDisplay === "date") return `حُمّص ${fmtDate(coffee.roastedOn)}`;
    return d === 0 ? "حُمّص اليوم" : d === 1 ? "حُمّص أمس" : `حُمّص قبل ${d} يوماً`;
  })();

  const identity = ([
    ["الدولة", coffee.country], ["المنطقة", coffee.region],
    ["الارتفاع", coffee.altitude], ["السلالة", coffee.variety],
    ["المعالجة", coffee.process], ["التحميص", coffee.roast],
    ["المزرعة", coffee.farm], ["تقييم SCA", coffee.sca],
  ] as [string, string | number | undefined][]).filter(([, v]) => v) as [string, string][];

  const meters = ([
    ["حلاوة", coffee.flavorSweetness], ["قوام", coffee.flavorBody],
  ] as [string, number | undefined][]).filter(([, v]) => v) as [string, number][];

  const suggestions = tools.filter((t) => !t.soldOut && (t.price ?? 0) > 0).slice(0, 4);
  const others = coffees.filter((c) => c.slug !== coffee.slug && !c.soldOut).slice(0, 3);

  /* حزمة «خذها معاً» — أدوات تناسب الطحن المختار */
  const bundle = useMemo(() => {
    const want = /إسبريسو/.test(grind) ? ["tamper", "distributor", "cup"] : ["filter", "dripper", "server", "cup"];
    const picked: Tool[] = [];
    for (const key of want) {
      const t = tools.find((x) => !x.soldOut && (x.price ?? 0) > 0 && !picked.includes(x)
        && (x.slug.includes(key) || (x.type ?? "").includes(key)));
      if (t) picked.push(t);
      if (picked.length >= 2) break;
    }
    if (picked.length < 2) {
      for (const t of tools) {
        if (picked.length >= 2) break;
        if (!t.soldOut && (t.price ?? 0) > 0 && !picked.includes(t)) picked.push(t);
      }
    }
    return picked;
  }, [tools, grind]);

  const gearSum = bundle.reduce((t: number, x: Tool) => t + (x.price ?? 0), 0);
  const BUNDLE_OFF = 1000;
  const bundleSave = bundle.length * BUNDLE_OFF;
  const bundleTotal = Math.ceil((unit + gearSum - bundleSave) / 250) * 250;

  const addBundle = () => {
    const bid = `bundle-${coffee.slug}-${Date.now()}`;
    addToCart({ slug: coffee.slug, variant: safeWeight.toUpperCase() as "G250" | "G500" | "G1000",
      grind, name: coffee.name, meta: `${weightLabel} · ${grind}`, priceShown: unit, bundleId: bid });
    bundle.forEach((t: Tool) => addToCart({
      slug: t.slug, variant: "PIECE", grind: "", name: t.name, meta: "حزمة",
      priceShown: Math.max(0, (t.price ?? 0) - BUNDLE_OFF), bundleId: bid,
    }));
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  };

  /* الأقسام المطوية */
  const sections: { key: string; title: string; body: React.ReactNode }[] = [];
  if (coffee.brew?.length) sections.push({ key: "brew", title: "كيف أحضّرها", body: (
    <div className="flex flex-col gap-3">
      {coffee.brew.map((b) => (
        <div key={b.name} className="flex flex-col gap-1">
          <p className="text-[13.5px] font-semibold">{b.name}</p>
          <p className="font-num text-[13.5px] leading-[1.95] text-muted" dir="ltr" style={{ textAlign: "start" }}>{toLatinDigits(b.nums)}</p>
        </div>
      ))}
      <p className="text-[13.5px] leading-[1.95] text-muted">
        اترك الكيس يرتاح من ١٠ إلى ٢٠ يوماً بعد التحميص. الحبّ الطازج جداً يطلق ثاني أكسيد الكربون فيفسد التقطير ويرفع الحموضة بحدّة — وبعد هذه المدّة يستقرّ الطعم وتظهر الحلاوة.
      </p>
    </div>
  )});
  if (coffee.story) sections.push({ key: "story", title: "قصة المحصول", body: (
    <div className="flex flex-col gap-3">
      {coffee.story.split("\n").filter(Boolean).map((p, i) => (
        <p key={i} className="text-[13.5px] leading-[1.95] text-muted">{p}</p>
      ))}
      {coffee.process && (
        <div className="mt-1 flex flex-col gap-2.5">
          <p className="text-[13.5px] font-semibold">المعالجة خطوة بخطوة</p>
          {processSteps(coffee.process).map((s, i) => (
            <div key={s.title} className="flex gap-3">
              <span className="font-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-bg-alt text-[11px] font-semibold">{i + 1}</span>
              <div>
                <p className="text-[13px] font-semibold">{s.title}</p>
                <p className="mt-0.5 text-[13px] leading-[1.9] text-muted">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )});
  if (meters.length) sections.push({ key: "sensory", title: "كيف طعمها؟", body: (
    <div className="flex flex-col gap-3">
      {coffee.notes?.length >= 2 && (
        <div className="flex flex-col gap-2">
          {([["في البداية", coffee.notes[0]],
             ["في الوسط", coffee.notes[1] ?? coffee.notes[0]],
             ["والخاتمة", coffee.notes[2] ?? coffee.notes[1]]] as [string, string][]).map(([when, what]) => (
            <div key={when} className="flex items-baseline gap-2.5">
              <span className="w-[62px] shrink-0 text-[12px] text-muted">{when}</span>
              <span className="text-[14px] font-semibold">{what}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        {coffee.roast && (
          <span className="rounded-[8px] bg-bg-alt px-3 py-2 text-[12.5px]">
            <span className="text-muted">التحميص</span> <span className="font-semibold">{coffee.roast}</span>
          </span>
        )}
        {meters.map(([k, v]) => (
          <span key={k} className="rounded-[8px] bg-bg-alt px-3 py-2 text-[12.5px]">
            <span className="text-muted">{k}</span> <span className="font-semibold">{level(v)}</span>
          </span>
        ))}
      </div>
      {coffee.roast && <p className="mt-1 text-[13.5px] leading-[1.95] text-muted">{roastPhilosophy(coffee.roast)}</p>}
    </div>
  )});
  sections.push({ key: "trust", title: "لماذا تثق بقهوتنا", body: (
    <div className="flex flex-col gap-3">
      {[
        ["تحميص بدفعات صغيرة", "نحمّص كميات صغيرة متكرّرة بدل تخزين كميات كبيرة على الرف."],
        ["صمّام أحادي", "يُخرج غازات التحميص ويمنع دخول الهواء."],
        ["الدفع عند الاستلام", "افحص طلبك أمام المندوب قبل أن تدفع."],
      ].map(([h, t]) => (
        <div key={h} className="flex flex-col gap-1">
          <p className="text-[13.5px] font-semibold">{h}</p>
          <p className="text-[13.5px] leading-[1.95] text-muted">{t}</p>
        </div>
      ))}
    </div>
  )});
  sections.push({ key: "faq", title: "أسئلة شائعة", body: (
    <div className="flex flex-col gap-3">
      {faqGeneral.slice(0, 4).map((f) => (
        <div key={f.q} className="flex flex-col gap-1">
          <p className="text-[13.5px] font-semibold">{f.q}</p>
          <p className="text-[13.5px] leading-[1.95] text-muted">{f.a}</p>
        </div>
      ))}
    </div>
  )});


  return (
    <div ref={scope} className="mx-auto max-w-lg pb-40 md:max-w-2xl">
      <ProductJsonLd name={coffee.name} description={coffee.trigger || coffee.story || undefined}
        image={gallery[0]} slug={`c:${coffee.slug}`} price={coffee.prices.g250}
        inStock={!coffee.soldOut} rating={coffee.rating || undefined} reviewsCount={coffee.reviewsCount || undefined}
        faq={coffee.notes?.length ? [{ q: `ما نكهات ${coffee.name}؟`, a: coffee.notes.join("، ") + "." }] : []} />

      {/* ═══ المعرض ═══ */}
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-[#F5F1EC] via-[#EFE7DE] to-[#E4D8CC]">
        {shot < gallery.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gallery[shot]} alt={coffee.name} className="h-full w-full object-cover" />
        ) : slides[shot - gallery.length]
          ? <div className="h-full w-full">{slides[shot - gallery.length].el}</div>
          : <span className="font-[Amiri,serif] text-[15px] text-muted">{coffee.name}</span>}

        {coffee.badge && (
          <span className="absolute end-4 top-3.5 rounded-[6px] bg-bg-alt px-[11px] py-1.5 text-[11px] font-medium text-accent">
            {coffee.badge}
          </span>
        )}
        {coffee.soldOut && (
          <span className="absolute start-4 top-3.5 rounded-[6px] bg-accent px-[11px] py-1.5 text-[11px] font-bold text-white">نفد مؤقتاً</span>
        )}

        {totalShots > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {Array.from({ length: totalShots }).map((_, i) => (
              <button key={i} onClick={() => setShot(i)} aria-label={`صورة ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === shot ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ الاسم والسعر ═══ */}
      <div className="px-4 pt-6">
        <div className="flex items-start justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="font-[Amiri,serif] text-[34px] font-bold leading-[1.1]">{coffee.name}</h1>
            {coffee.latin && <p className="font-num text-[10.5px] tracking-[0.22em] text-muted">{coffee.latin.toUpperCase()}</p>}
            <p className="text-[13px] text-muted">
              {[coffee.country, coffee.region, coffee.roast].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-[3px]">
            <div className="flex items-baseline gap-1.5">
              <span className="font-num text-[26px] font-bold leading-none">{n(unit)}</span>
              <span className="text-[13px] text-muted">د.ع</span>
            </div>
          </div>
        </div>

        {/* التقييم المختصر */}
        {coffee.reviewsCount > 0 && (
          <a href="#reviews"
            className="mt-3 flex w-full items-center justify-between border-y border-line px-0.5 py-3">
            <span className="flex items-center gap-2">
              <Stars value={coffee.rating} size={13} />
              <span className="font-num text-[13.5px] font-semibold">{coffee.rating}</span>
              <span className="font-num text-[12.5px] text-muted">من {coffee.reviewsCount} تقييم</span>
            </span>
            <span className="text-[12.5px] text-accent">اقرأها</span>
          </a>
        )}

        {/* النكهات */}
        {coffee.notes?.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-[7px]">
            {coffee.notes.map((nt) => (
              <span key={nt} className="rounded-[6px] bg-bg-alt px-3 py-1.5 text-[12.5px] text-accent">{nt}</span>
            ))}
            {roastAge && (
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-olive">
                <span className="h-[6px] w-[6px] rounded-full bg-ok" />{roastAge}
              </span>
            )}
          </div>
        )}

        {coffee.trigger && (
          <p className="mt-3 text-[14.5px] leading-[1.95]">{coffee.trigger}</p>
        )}

        {/* لماذا تختار هذه */}
        <div className="mt-4 rounded-[12px] border border-line bg-bg-alt p-4">
          <p className="text-[13px] font-bold">لماذا تختار {coffee.name}؟</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {whyPick(coffee).map((w) => (
              <li key={w} className="flex gap-2 text-[13px] leading-[1.85] text-muted">
                <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-clay" />{w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ═══ منطقة الشراء ═══ */}
      <div ref={buyRef} className="px-4 pt-7">
        <p className="mb-[9px] text-[12.5px] text-muted">الوزن</p>
        <div className="flex gap-[9px]">
          {availableWeights.map((w) => {
            const on = safeWeight === w.k;
            return (
              <button key={w.k} onClick={() => setWeight(w.k)}
                className={`flex min-h-[64px] flex-1 flex-col gap-0.5 rounded-[10px] p-[11px_12px] text-start transition-all active:scale-[0.97] ${
                  on ? "border-2 border-olive bg-olive/6 font-semibold" : "border border-line bg-bg hover:border-olive/45 hover:bg-bg-alt"}`}>
                <span className="text-[15px]">{on ? "✓ " : ""}{w.label}</span>
                <span className="font-num text-[12.5px] text-muted">{n(coffee.prices[w.k]!)} د.ع</span>
              </button>
            );
          })}
        </div>

        <p className="mb-[9px] mt-4 text-[12.5px] text-muted">الطحن</p>
        <div className="flex flex-wrap gap-2">
          {grindOptions.map((g) => {
            const on = grind === g;
            return (
              <button key={g} onClick={() => setGrind(g)}
                className={`min-h-[44px] rounded-[10px] px-3.5 text-[13px] transition-all active:scale-[0.97] ${
                  on ? "border-2 border-olive bg-olive/6 font-semibold" : "border border-line bg-bg hover:border-olive/45 hover:bg-bg-alt"}`}>
                {on ? "✓ " : ""}{g}
              </button>
            );
          })}
        </div>

        <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{grindHint(grind)}</p>

        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex shrink-0 items-center rounded-[10px] border border-line bg-bg p-[3px]">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="أنقص"
              className="h-12 w-11 rounded-[8px] text-[19px] hover:bg-bg-alt">−</button>
            <span className="font-num min-w-[32px] text-center text-[15px] font-semibold">{qty}</span>
            <button onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="زد"
              className="h-12 w-11 rounded-[8px] text-[19px] hover:bg-bg-alt disabled:opacity-30">+</button>
          </div>
          <button onClick={add} disabled={coffee.soldOut}
            className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-olive text-[16px] font-semibold text-olive-text transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
            {coffee.soldOut ? "نفد مؤقتاً" : (
              <><span>أضف للسلة</span><span className="opacity-55">·</span><span className="font-num">{n(totalPrice)}</span></>
            )}
          </button>
        </div>

        {added && (
          <div className="mt-2.5 rounded-[8px] border border-ok/35 bg-ok/8 p-[11px_13px] text-[13px] text-ok">
            تمت إضافة المنتج إلى السلة.
          </div>
        )}
        <p className="mt-2.5 text-[12.5px] font-semibold text-accent">
          تبقّى {n(batchLeft)} أكياس من هذه الدفعة
        </p>

        <div className="mt-3 flex flex-col gap-2 rounded-[10px] bg-bg-alt p-[13px_14px] text-[13px]">
          <div className="flex flex-col gap-2.5">
            <p className="text-[12.5px]">
              <span className="text-muted">اطلب اليوم · </span>
              <span className="font-bold">يصلك {arrival}</span>
            </p>
            <div className="flex items-start">
              {[["نجهّز", "اليوم"], ["يخرج للشحن", "غداً"], ["يصلك", arrival.split("،")[0] ?? arrival]].map(([t, d], i, a) => (
                <div key={t} className="relative flex flex-1 flex-col items-center gap-1.5">
                  {i < a.length - 1 && <span className="absolute top-[5px] h-px w-full translate-x-1/2 bg-line" />}
                  <span className={`relative h-2.5 w-2.5 rounded-full ${i === 2 ? "border-2 border-clay bg-bg" : "bg-clay"}`} />
                  <span className="text-[11px] font-semibold">{t}</span>
                  <span className="text-[10px] text-muted">{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between"><span className="text-muted">الدفع</span><span className="font-medium">عند الاستلام</span></div>
          <div className="flex justify-between"><span className="text-muted">نقاطك من هذا الطلب</span><span className="font-num font-medium text-ok">{n(cashback)} نقطة</span></div>
        </div>
      </div>

      {coffee.soldOut && (
        <div className="px-4 pt-4"><LeadCapture source="restock" productSlug={coffee.slug} productName={coffee.name} /></div>
      )}

      {/* ═══ البوكس — مباشرة بعد الشراء، بمكسب محسوب ═══ */}
      {!coffee.soldOut && (
        <div className="mx-4 mt-4 overflow-hidden rounded-[14px] border-2 border-gold/45 bg-gold/8">
          <div className="p-4">
            <p className="text-[11px] font-bold tracking-wide text-accent">وفّر أكثر</p>
            <p className="mt-1.5 font-[Amiri,serif] text-[22px] font-bold leading-snug">
              خذ كيسين — تدفع <span className="font-num text-clay">{n(two)}</span> بدل <span className="font-num text-muted line-through">{n(unit * 2)}</span>
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {boxRows.map((r, i) => (
                <div key={r.bags} className={`flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 ${
                  i === 2 ? "bg-gold/20" : "bg-bg/60"}`}>
                  <span className="font-num text-[13px] font-semibold">
                    {r.bags === 2 ? "كيسان" : r.bags === 3 ? "٣ أكياس" : "٤ أكياس"}
                  </span>
                  {r.gift && <span className="text-[11.5px] text-accent">+ {r.gift}</span>}
                  <span className="font-num text-[12px] font-bold text-ok">توفّر {n(r.save)}</span>
                </div>
              ))}
            </div>
            <Link href="/box/"
              className="mt-3.5 flex min-h-[50px] w-full items-center justify-center rounded-[10px] bg-clay text-[15px] font-semibold text-white transition-transform active:scale-[0.98]">
              اصنع صندوقك
            </Link>
            <p className="mt-2 text-center text-[11.5px] text-muted">اخلط المحاصيل كما تشاء — والهدية تُضاف تلقائياً</p>
          </div>
        </div>
      )}

      {/* ═══ معلومات المحصول ═══ */}
      {identity.length > 0 && (
        <div className="mx-4 mt-7 rounded-[12px] border border-line bg-bg p-5">
          <p className="mb-3 text-[12px] text-muted">معلومات المحصول</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3">
            {identity.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-[3px]">
                <span className="text-[11px] text-muted">{k}</span>
                <span className="text-[13.5px] font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ الأقسام المطوية ═══ */}
      <div className="px-4 pt-6">
        {sections.map((s) => (
          <div key={s.key} className="border-b border-line">
            <button onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}
              className="flex min-h-[54px] w-full items-center justify-between py-[15px] text-start">
              <span className="text-[14.5px] font-semibold">{s.title}</span>
              <span className="text-[18px] text-muted">{open[s.key] ? "−" : "+"}</span>
            </button>
            {open[s.key] && <div className="pb-[18px] pt-0.5">{s.body}</div>}
          </div>
        ))}
      </div>

      {/* ═══ خذها معاً — حزمة بخصم ═══ */}
      {!coffee.soldOut && bundle.length > 0 && (
        <section className="mx-4 mt-8 rounded-[14px] border border-line bg-bg p-4">
          <p className="font-[Amiri,serif] text-[22px] font-bold">خذها معاً</p>
          <p className="mt-1 text-[12.5px] text-muted">كل ما تحتاجه لتحضير فنجان — بخصم على الحزمة</p>

          <div className="mt-3.5 flex items-center gap-2">
            {[coffee, ...bundle].map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-[15px] text-muted">+</span>}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border border-line bg-card">
                  {("image" in it ? it.image : (it as Tool).images?.[0]) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={("image" in it ? it.image : (it as Tool).images?.[0])!} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">{coffee.name} · {weightLabel}</span>
              <span className="font-num">{n(unit)}</span>
            </div>
            {bundle.map((t: Tool) => (
              <div key={t.slug} className="flex justify-between text-[13px]">
                <span className="text-muted">{t.name}</span>
                <span className="font-num">{n(t.price ?? 0)}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-[13px] text-ok">
              <span>خصم الحزمة — {n(BUNDLE_OFF)} لكل أداة</span>
              <span className="font-num">−{n(bundleSave)}</span>
            </div>
            <div className="flex justify-between text-[15px] font-bold">
              <span>الإجمالي</span>
              <span className="font-num">{n(bundleTotal)} د.ع</span>
            </div>
          </div>

          <button onClick={addBundle}
            className="mt-3.5 flex min-h-[50px] w-full items-center justify-center rounded-[10px] bg-olive text-[15px] font-semibold text-olive-text transition-all hover:brightness-110 active:scale-[0.98]">
            أضف الحزمة للسلة
          </button>
          <p className="mt-2 text-center text-[11.5px] text-muted">تُضاف وتُحذف كحزمة واحدة</p>
        </section>
      )}

      {/* ═══ مقترحات ═══ */}
      {(others.length > 0 || suggestions.length > 0) && (
        <section className="px-4 pt-8">
          <h2 className="font-[Amiri,serif] text-[22px] font-bold">قد يعجبك أيضاً</h2>
          {others.length > 0 && (
            <p className="mt-1 text-[12.5px] text-muted">
              إن أعجبتك {coffee.name}، جرّب {others.map((c) => c.name).join(" أو ")}
            </p>
          )}
          <div className="no-scrollbar -mx-4 mt-3.5 flex gap-3 overflow-x-auto px-4 pb-2">
            {others.map((c) => (
              <div key={c.slug} className="w-[42%] max-w-[180px] shrink-0"><CoffeeCard coffee={c} /></div>
            ))}
            {suggestions.map((t: Tool) => (
              <div key={t.slug} className="w-[42%] max-w-[180px] shrink-0"><ToolCard tool={t} /></div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ الطمأنة ═══ */}
      <div className="mt-7 flex flex-col gap-3 border-t border-line bg-bg-alt p-[20px_16px]">
        <p className="font-[Amiri,serif] text-[21px] font-bold">خزف</p>
        <div className="flex text-center text-[12px] text-muted">
          <span className="flex-1">توصيل ١–٢ يوم</span>
          <span className="flex-1 border-x border-line">٣٪ كاش باك</span>
          <span className="flex-1">تحميص حديث</span>
        </div>
      </div>

      {/* ═══ الشريط الثابت ═══ */}
      {!coffee.soldOut && showBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg shadow-[0_-4px_18px_rgba(28,28,28,.06)]">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-[18px] pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11.5px] text-muted">{weightLabel} · {grind}</span>
              <span className="font-num text-[16px] font-bold">{n(totalPrice)} د.ع</span>
            </div>
            <button onClick={add}
              className={`min-h-[50px] flex-1 rounded-[10px] text-[15px] font-semibold transition-colors active:scale-[0.98] ${
                added ? "bg-ok text-olive-text" : "bg-olive text-olive-text"}`}>
              {added ? "✓ أُضيف" : "أضف للسلة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** وصف المستوى بكلمة بدل رقم */
function level(v: number): string {
  return v >= 5 ? "عالية جداً" : v >= 4 ? "عالية" : v >= 3 ? "متوسطة" : v >= 2 ? "خفيفة" : "خفيفة جداً";
}

/** تلميح حسب الطحن المختار */
function grindHint(g: string): string {
  if (/حبوب/.test(g)) return "الأفضل للطزاجة — تطحنها عند التحضير فتحتفظ بالعطر كاملاً.";
  if (/V60|فلتر/.test(g)) return "طحن متوسط يناسب V60 والكيمكس والقطرة.";
  if (/إسبريسو/.test(g)) return "طحن ناعم للماكنة — أخبرنا بنوع الباسكت إن أردت ضبطاً أدقّ.";
  return "";
}

/** ثلاثة أسباب للاختيار — من بيانات المحصول نفسه */
function whyPick(c: Coffee): string[] {
  const out: string[] = [];
  if (c.notes?.length) out.push(`نكهاتها ${c.notes.join(" و")} — كوب واضح لا يحتاج سكّراً.`);
  if (c.process) out.push(`معالجة ${c.process}${/مغسول/.test(c.process) ? " تعطي نظافة وحموضة مشرقة" : " تعطي حلاوة وقواماً أثقل"}.`);
  if (c.altitude) out.push(`نمت على ارتفاع ${c.altitude} — النضج البطيء يركّز النكهة.`);
  out.push("تناسب الإسبريسو والتقطير ومشروبات الحليب — باردة كانت أو ساخنة.");
  if (out.length < 4) out.push("محدّدة المصدر ومحمّصة بدفعات صغيرة — لا خلطات مجهولة.");
  return out.slice(0, 4);
}

/** تحويل الأرقام العربية إلى لاتينية للوضوح */
function toLatinDigits(t: string): string {
  return String(t ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function processSteps(process: string): { title: string; body: string }[] {
  if (/طبيعي/.test(process)) return [
    { title: "القطف", body: "تُقطف الثمرة الحمراء الناضجة وحدها، وتُترك الخضراء لجولة قادمة." },
    { title: "الفرز بالكثافة", body: "تُغمر الثمار بالماء فتطفو الخفيفة المعيبة وتُستبعد." },
    { title: "التجفيف بالقشرة", body: "تُنشر الثمار كاملة تحت الشمس وتُقلَّب يومياً — فتنتقل حلاوة اللبّ إلى الحبّة." },
    { title: "التقشير والفرز", body: "تُزال القشرة الجافة وتُفرز الحبوب قبل التعبئة." },
  ];
  if (/عسل|هني/.test(process)) return [
    { title: "القطف", body: "قطف انتقائي للثمار الناضجة تماماً." },
    { title: "التقشير الجزئي", body: "تُزال القشرة ويُترك جزء من اللبّ اللزج على الحبّة." },
    { title: "التجفيف", body: "تجفّ على أسرّة مرتفعة مع اللبّ — فتكتسب حلاوة وقواماً." },
    { title: "الفرز", body: "فرز نهائي قبل التعبئة." },
  ];
  return [
    { title: "القطف الانتقائي", body: "تُجمع الثمرة الحمراء وحدها باليد وتُترك الخضراء لجولة قادمة بعد أسبوعين." },
    { title: "التقشير", body: "تُزال القشرة ومعظم اللبّ في محطة الغسل." },
    { title: "التخمير", body: "تُنقع الحبوب في أحواض ماء حتى يتحلّل ما تبقّى من اللبّ، ثم تُغسل." },
    { title: "التجفيف", body: "تُنشر على أسرّة مرتفعة وتُقلَّب حتى تصل رطوبتها نحو ١١٪." },
  ];
}

function roastPhilosophy(roast: string): string {
  if (/داكن/.test(roast)) return "نحمّصه داكناً بتحكّم دقيق. الهدف قوام ثقيل وحلاوة كراميلية عميقة بلا مرارة محروقة.";
  if (/متوسط/.test(roast)) return "نحمّصه متوسطاً لنوازن بين الحلاوة والقوام — تطوير كافٍ ليظهر الكراميل والمكسّرات، ووقوف قبل أن تُطمس نكهات الأصل.";
  return "نحمّصه فاتحاً ونوقف التطوير مبكراً. أي زيادة تطمس الطبقات العليا وتحوّلها إلى مرارة مألوفة — الهدف أن يبقى الحمض نظيفاً والقوام خفيفاً كالشاي.";
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
