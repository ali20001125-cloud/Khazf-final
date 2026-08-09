"use client";
/** الرئيسية — بنية المتجر الكامل */
import Link from "next/link";
import { ArrowLeft, Package, Wallet, Gift, Coffee, Beaker, CupSoda, Star } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useStore, useSiteConfig } from "@/lib/store";
import { formatIQD } from "@/lib/data";
import { CoffeeCard } from "@/components/Cards";

/* ═══ ١) البطل ═══ */
export function Hero() {
  const { coffees } = useCatalog();
  const best = coffees.filter((c) => !c.soldOut)[0];
  return (
    <section className="mx-auto max-w-lg px-4 pt-6 md:max-w-5xl md:px-8">
      <div className="rounded-[20px] border border-line bg-card p-6 md:p-9">
        <p className="text-[11px] font-bold tracking-wide text-accent">قهوة مختصة · بغداد</p>
        <h1 className="mt-2.5 font-[Amiri,serif] text-[28px] font-bold leading-[1.35] md:text-[38px]">
          قهوتك المفضّلة،<br />من أول رشفة
        </h1>
        <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-muted">
          اختر محصولاً طازجاً أو ابنِ صندوق ذوقك — قهوة مختصة، اختيارات واضحة، وشراء بسيط.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link href={best ? `/product/?c=${best.slug}` : "/products/?cat=coffee"}
            className="flex min-h-[48px] items-center gap-2 rounded-[12px] bg-olive px-6 text-[14.5px] font-bold text-olive-text transition-all hover:brightness-110 active:scale-[0.98]">
            تسوّق المحاصيل <ArrowLeft size={15} />
          </Link>
          <Link href="/box/"
            className="flex min-h-[48px] items-center gap-2 rounded-[12px] border border-line bg-bg px-6 text-[14.5px] font-bold transition-all hover:border-clay active:scale-[0.98]">
            ابنِ صندوقك
          </Link>
        </div>
      </div>

      {/* ثلاث شرائح ثقة */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[["طازجة وقت الطلب", "تحميص بدفعات صغيرة"],
          ["الدفع عند الاستلام", "افحص قبل أن تدفع"],
          ["خيارات طحن واضحة", "للفلتر أو الإسبريسو"]].map(([t, d]) => (
          <div key={t} className="rounded-[13px] border border-line bg-bg p-3 text-center">
            <p className="text-[11.5px] font-bold leading-tight">{t}</p>
            <p className="mt-1 text-[10px] leading-tight text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٢) المحاصيل ═══ */
export function Crops() {
  const { coffees } = useCatalog();
  const list = coffees.filter((c) => !c.soldOut);
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="font-[Amiri,serif] text-[24px] font-bold">الأكثر مبيعاً</h2>
          <p className="mt-1 text-[12.5px] text-muted">محاصيل يحبّها العملاء ومناسبة لبداية سهلة</p>
        </div>
        <Link href="/products/?cat=coffee" className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-accent">
          الكل <ArrowLeft size={13} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.slice(0, 4).map((c) => <CoffeeCard key={c.slug} coffee={c} />)}
      </div>
    </section>
  );
}

/* ═══ ٣) البوكس ═══ */
export function BoxSection() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <div className="overflow-hidden rounded-[20px] bg-olive text-olive-text">
        <div className="p-6 md:p-9">
          <p className="text-[11px] font-bold tracking-wide text-gold">هدية لك أو لنفسك · خصم يصل ٢٠٪</p>
          <h2 className="mt-2.5 font-[Amiri,serif] text-[26px] font-bold leading-snug md:text-[32px]">
            صندوقك على ذوقك
          </h2>
          <p className="mt-2.5 max-w-md text-[13px] leading-relaxed opacity-82">
            اختر المحاصيل، أضف ما تحتاجه، وشاهد التوفير مباشرة.
          </p>

          <div className="mt-5 flex flex-col gap-2 md:max-w-sm">
            {[["كيسان", "خصم ٤٪"], ["٣ أكياس", "خصم ١٢٪ + ملعقة"], ["٤ فأكثر", "خصم ٢٠٪ + كوب"]].map(([a, b], i) => (
              <div key={a} className={`flex items-center justify-between rounded-[11px] px-4 py-2.5 text-[13px] ${
                i === 2 ? "bg-gold/22 font-bold" : "bg-white/8"}`}>
                <span>{a}</span><span className={i === 2 ? "text-gold" : "opacity-80"}>{b}</span>
              </div>
            ))}
          </div>

          <Link href="/box/"
            className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-[12px] bg-gold px-7 text-[14.5px] font-bold text-olive transition-all hover:brightness-105 active:scale-[0.98]">
            ابدأ بناء الصندوق <ArrowLeft size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══ ٤) أي قهوة تناسبك ═══ */
export function PickPath() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <p className="text-[11px] font-bold tracking-wide text-accent">اختصر الحيرة</p>
      <h2 className="mt-2 font-[Amiri,serif] text-[24px] font-bold">أي قهوة تناسبك؟</h2>
      <p className="mt-1 text-[12.5px] text-muted">اختر طريقتك ونعرض لك ما يقرب من ذوقك</p>

      <div className="mt-4 flex flex-col gap-2.5 md:grid md:grid-cols-2">
        {[
          { t: "أحبّها مركّزة", s: "للإسبريسو", d: "متوازنة وغنية ومناسبة للحليب", href: "/products/?cat=coffee&taste=espresso" },
          { t: "أحبّ الطعم الواضح", s: "للتقطير", d: "فواكه وحمضيات تظهر بوضوح", href: "/products/?cat=coffee&taste=filter" },
        ].map((x) => (
          <Link key={x.t} href={x.href}
            className="rounded-[16px] border border-line bg-card p-5 transition-all hover:border-clay active:scale-[0.99]">
            <p className="text-[11px] font-bold text-clay">{x.s}</p>
            <p className="mt-1.5 text-[16px] font-bold">{x.t}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{x.d}</p>
            <span className="mt-3 flex items-center gap-1 text-[12.5px] font-bold text-accent">
              اعرض المحاصيل <ArrowLeft size={13} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٥) التقييمات — حقيقية فقط ═══ */
export function Reviews() {
  const { coffees } = useCatalog();
  const rated = coffees.filter((c) => c.reviewsCount > 0);
  const total = rated.reduce((t, c) => t + c.reviewsCount, 0);
  if (total < 3) return null;
  const avg = (rated.reduce((t, c) => t + c.rating * c.reviewsCount, 0) / total).toFixed(1);

  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <div className="rounded-[18px] border border-line bg-card p-6 text-center">
        <p className="text-[11px] font-bold tracking-wide text-accent">ثقة من أول طلب</p>
        <p className="font-num mt-2 text-[38px] font-bold leading-none">{avg}</p>
        <div className="mt-2 flex justify-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={15} className={i < Math.round(Number(avg)) ? "fill-gold text-gold" : "text-line"} />
          ))}
        </div>
        <p className="font-num mt-2 text-[12.5px] text-muted">من {total} تقييم لعملائنا</p>
      </div>
    </section>
  );
}

/* ═══ ٦) تكمّل طقوسك ═══ */
export function Gear() {
  const { activePlaces } = useCatalog();
  const cards = [
    { href: "/products/?cat=drip", Icon: Beaker, s: "لتحضير أفضل", t: "أدوات التحضير", d: "فلاتر وسيرفرات وأقماع مختارة", place: "drip_tools" },
    { href: "/products/?cat=cups", Icon: CupSoda, s: "للتقديم", t: "الأكواب والتقديم", d: "قطع بسيطة تكمّل تجربتك", place: "cups" },
  ].filter((c) => activePlaces.includes(c.place));
  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <h2 className="font-[Amiri,serif] text-[24px] font-bold">تكمّل طقوسك</h2>
      <p className="mt-1 text-[12.5px] text-muted">كل ما تحتاجه بعد اختيار القهوة</p>
      <div className="mt-4 flex flex-col gap-2.5 md:grid md:grid-cols-2">
        {cards.map(({ href, Icon, s, t, d }) => (
          <Link key={t} href={href}
            className="flex items-center gap-4 rounded-[16px] border border-line bg-card p-5 transition-all hover:border-clay active:scale-[0.99]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-bg-alt text-clay">
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-clay">{s}</span>
              <span className="mt-0.5 block text-[15px] font-bold">{t}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{d}</span>
            </span>
            <ArrowLeft size={15} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٧) العروض ═══ */
export function Offers() {
  const config = useSiteConfig();
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <h2 className="font-[Amiri,serif] text-[24px] font-bold">اكتشف عروضنا</h2>
      <div className="mt-4 flex flex-col gap-2.5 md:grid md:grid-cols-3">
        {[
          { Icon: Package, t: "خصم البوكس", d: "يصل إلى ٢٠٪ مع هدية", href: "/box/" },
          { Icon: Wallet, t: `${config.cashbackPct ?? 3}٪ نقاط`, d: "تعود خصماً في طلبك القادم", href: "/cashback/" },
          { Icon: Gift, t: "رحلة المكافآت", d: "ستّ طلبات آخرها كيس مجاني", href: "/account/" },
        ].map(({ Icon, t, d, href }) => (
          <Link key={t} href={href}
            className="flex items-center gap-3.5 rounded-[14px] border border-gold/30 bg-gold/6 p-4 transition-all active:scale-[0.99]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gold/18 text-gold-text">
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold">{t}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{d}</span>
            </span>
            <ArrowLeft size={14} className="shrink-0 text-gold" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٨) لماذا خزف ═══ */
export function Why() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <h2 className="font-[Amiri,serif] text-[24px] font-bold">لماذا خزف</h2>
      <div className="mt-4 flex flex-col gap-2.5 md:grid md:grid-cols-3">
        {[
          ["تحميص بدفعات صغيرة", "نحمّص كميات متكرّرة بدل تخزين كميات كبيرة على الرف"],
          ["مصادر محدّدة", "محاصيل من مناطق نعرفها — بلا خلطات مجهولة"],
          ["الدفع عند الاستلام", "افحص طلبك أمام المندوب قبل أن تدفع"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-[14px] border border-line bg-card p-4">
            <p className="text-[13.5px] font-bold">{t}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٩) الترشيح ═══ */
export function FinderCta({ children }: { children?: React.ReactNode }) {
  return (
    <section id="finder" className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <div className="rounded-[18px] border border-clay/35 bg-clay/5 p-6 text-center">
        <h2 className="font-[Amiri,serif] text-[22px] font-bold">لا تعرف من أين تبدأ؟</h2>
        <p className="mt-1.5 text-[12.5px] text-muted">أجب عن ثلاثة أسئلة ونرشّح لك محصولاً مناسباً</p>
        <div className="mt-4 text-start">{children}</div>
      </div>
    </section>
  );
}
