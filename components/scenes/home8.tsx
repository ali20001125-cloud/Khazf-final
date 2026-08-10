"use client";
/** الرئيسية — W1 Soft Editorial: مساحات وطباعة، لا صور كثيرة */
import Link from "next/link";
import { ArrowLeft, Star, Beaker, CupSoda, Gift } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig } from "@/lib/store";
import { formatIQD } from "@/lib/data";

/* ═══ ١) البطل ═══ */
export function Hero() {
  const { coffees } = useCatalog();
  const config = useSiteConfig();
  const rated = coffees.filter((c) => c.reviewsCount > 0);
  const total = rated.reduce((t, c) => t + c.reviewsCount, 0);
  const avg = total > 0
    ? (rated.reduce((t, c) => t + c.rating * c.reviewsCount, 0) / total).toFixed(1)
    : null;

  return (
    <section className="mx-auto max-w-lg px-5 pt-8 md:max-w-4xl md:px-8 md:pt-14">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
        قهوة مختصة · تحميص بدفعات صغيرة
      </p>
      <h1 className="mt-4 font-[Amiri,serif] text-[34px] font-bold leading-[1.28] md:text-[52px]">
        قهوتك، من أول رشفة
      </h1>
      <p className="mt-4 max-w-md text-[14px] leading-[1.95] text-muted md:text-[15px]">
        محاصيل محدّدة المصدر نحمّصها بدفعات صغيرة، وتصلك بابك خلال يوم إلى يومين —
        اختر محصولك، أو ابنِ صندوقاً على ذوقك.
      </p>

      <div className="mt-7 flex flex-wrap gap-2.5">
        <Link href="/products/?cat=coffee"
          className="flex min-h-[50px] items-center gap-2 rounded-[12px] bg-olive px-7 text-[14.5px] font-bold text-olive-text transition-all hover:brightness-110 active:scale-[0.98]">
          تصفّح المحاصيل <ArrowLeft size={15} />
        </Link>
        <Link href="/box/"
          className="flex min-h-[50px] items-center gap-2 rounded-[12px] border border-ink/25 px-7 text-[14.5px] font-bold transition-all hover:border-ink active:scale-[0.98]">
          ابنِ بوكسك
        </Link>
      </div>

      {/* عناصر الثقة */}
      <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-line pt-6 text-[12px]">
        {avg && (
          <span className="flex items-center gap-1.5">
            <Star size={13} className="fill-gold text-gold" />
            <span className="font-num font-bold">{avg}</span>
            <span className="text-muted">تقييم العملاء</span>
          </span>
        )}
        <span className="text-muted">توصيل ١–٢ يوم</span>
        <span className="text-muted">{config.cashbackPct ?? 3}٪ نقاط ولاء</span>
      </div>
    </section>
  );
}

/* ═══ ٢) شريط الثقة ═══ */
export function TrustBar() {
  const config = useSiteConfig();
  return (
    <section className="mt-9 border-y border-line bg-bg-alt">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-px bg-line md:grid-cols-4">
        {[
          ["توصيل ١–٢ يوم", "لكل محافظات العراق"],
          ["الدفع عند الاستلام", "افحص قبل أن تدفع"],
          [`${config.cashbackPct ?? 3}٪ نقاط`, "تعود خصماً بطلبك القادم"],
          ["تحميص بدفعات صغيرة", "لا تخزين على الرف"],
        ].map(([t, d]) => (
          <div key={t} className="bg-bg-alt px-4 py-5">
            <p className="text-[12.5px] font-bold">{t}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٣) المحاصيل — تمرير أفقي بشارة الأكثر مبيعاً ═══ */
export function Crops() {
  const { coffees } = useCatalog();
  const list = coffees.filter((c) => !c.soldOut);
  if (list.length === 0) return null;

  return (
    <section className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[Amiri,serif] text-[26px] font-bold md:text-[32px]">المحاصيل</h2>
          <p className="mt-1.5 text-[12.5px] text-muted">ثلاثة أذواق مختلفة — اختر ما يشبهك</p>
        </div>
        <Link href="/products/?cat=coffee" className="shrink-0 whitespace-nowrap text-[12.5px] font-bold text-accent">
          الكل ←
        </Link>
      </div>

      <div className="no-scrollbar -mx-5 mt-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-2 md:px-0">
        {list.map((c, i) => (
          <Link key={c.slug} href={`/product/?c=${c.slug}`}
            className="w-[76%] shrink-0 snap-start overflow-hidden rounded-[18px] border border-line bg-card transition-all hover:border-clay/50 active:scale-[0.99] md:w-auto">
            <div className="relative aspect-[4/3] bg-bg-alt">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center font-[Amiri,serif] text-[15px] text-muted">{c.name}</span>
              )}
              {i === 0 && (
                <span className="absolute end-3 top-3 rounded-full bg-bg/92 px-2.5 py-1 text-[10px] font-bold text-accent backdrop-blur-sm">
                  الأكثر مبيعاً
                </span>
              )}
            </div>

            <div className="p-4">
              <p className="text-[10.5px] font-semibold tracking-wide text-muted">
                {[c.country, c.process].filter(Boolean).join(" · ")}
              </p>
              <h3 className="mt-1.5 font-[Amiri,serif] text-[22px] font-bold leading-tight">{c.name}</h3>
              {c.notes?.length > 0 && (
                <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: c.accent }}>
                  {c.notes.join(" · ")}
                </p>
              )}
              <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3.5">
                <span className="font-num text-[16px] font-bold">{formatIQD(c.prices.g250)}</span>
                <span className="flex items-center gap-1 text-[12px] font-bold text-accent">
                  اعرف أكثر <ArrowLeft size={12} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length > 2 && (
        <p className="mt-1 text-[11.5px] text-muted md:hidden">اسحب لاكتشاف الباقي ←</p>
      )}
    </section>
  );
}

/* ═══ ٤) ابنِ بوكسك ═══ */
export function BuildBox() {
  return (
    <section className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <div className="rounded-[20px] bg-olive p-7 text-olive-text md:p-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-gold">ابنِ بوكسك</p>
        <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold leading-[1.35] md:text-[36px]">
          اختَر أكثر.<br />وفّر أكثر.
        </h2>

        <div className="mt-6 flex flex-col gap-px overflow-hidden rounded-[12px] bg-white/12 md:max-w-md">
          {[["كيسان", "خصم ٤٪"], ["٣ أكياس", "خصم ١٢٪ + ملعقة إسبريسو"], ["٤ فأكثر", "خصم ٢٠٪ + كوب"]].map(([a, b], i) => (
            <div key={a} className={`flex items-center justify-between px-4 py-3.5 text-[13px] ${
              i === 2 ? "bg-gold/25 font-bold" : "bg-olive"}`}>
              <span>{a}</span>
              <span className={i === 2 ? "text-gold" : "opacity-80"}>{b}</span>
            </div>
          ))}
        </div>

        <Link href="/box/"
          className="mt-6 inline-flex min-h-[50px] items-center gap-2 rounded-[12px] bg-gold px-7 text-[14.5px] font-bold text-olive transition-all hover:brightness-105 active:scale-[0.98]">
          ابدأ بناء البوكس <ArrowLeft size={15} />
        </Link>
        <p className="mt-3 text-[11.5px] opacity-70">يُضاف للسلة كحزمة واحدة</p>
      </div>
    </section>
  );
}

/* ═══ ٥) الأدوات والأكواب ═══ */
export function Gear() {
  const { activePlaces } = useCatalog();
  const cards = [
    { href: "/products/?cat=drip", Icon: Beaker, n: "01 · BREW", t: "الأدوات", d: "فلاتر وسيرفرات وأدوات التحضير", place: "drip_tools" },
    { href: "/products/?cat=cups", Icon: CupSoda, n: "02 · SERVE", t: "الأكواب", d: "قطع مختارة للقهوة اليومية", place: "cups" },
    { href: "/box/", Icon: Gift, n: "03 · GIFT", t: "الهدايا", d: "صندوق جاهز يصلح هديّة", place: null },
  ].filter((c) => !c.place || activePlaces.includes(c.place));
  if (cards.length === 0) return null;

  return (
    <section className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <h2 className="font-[Amiri,serif] text-[26px] font-bold md:text-[32px]">أكمِل تجربتك</h2>
      <p className="mt-1.5 text-[12.5px] text-muted">بعد القهوة — كل ما تحتاجه للتحضير والتقديم</p>
      <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-[16px] border border-line bg-line md:grid-cols-3">
        {cards.map(({ href, Icon, n, t, d }) => (
          <Link key={t} href={href}
            className="flex items-center gap-4 bg-bg p-5 transition-colors hover:bg-card">
            <Icon size={19} className="shrink-0 text-clay" />
            <span className="min-w-0 flex-1">
              <span className="font-num block text-[9.5px] tracking-[0.2em] text-muted">{n}</span>
              <span className="mt-1 block text-[14.5px] font-bold">{t}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{d}</span>
            </span>
            <ArrowLeft size={14} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٦) التقييمات ═══ */
export function Reviews() {
  const { coffees } = useCatalog();
  const rated = coffees.filter((c) => c.reviewsCount > 0);
  const total = rated.reduce((t, c) => t + c.reviewsCount, 0);
  if (total < 3) return null;
  const avg = (rated.reduce((t, c) => t + c.rating * c.reviewsCount, 0) / total).toFixed(1);

  return (
    <section className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <div className="flex items-center gap-5 rounded-[18px] border border-line bg-card p-6">
        <div className="shrink-0 text-center">
          <p className="font-num text-[34px] font-bold leading-none">{avg}</p>
          <div className="mt-1.5 flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={12} className={i < Math.round(Number(avg)) ? "fill-gold text-gold" : "text-line"} />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1 border-s border-line ps-5">
          <p className="text-[13.5px] font-bold">تقييمات عملائنا</p>
          <p className="font-num mt-1 text-[12px] text-muted">من {total} تقييم على محاصيلنا</p>
        </div>
      </div>
    </section>
  );
}

/* ═══ ٧) لماذا خزف ═══ */
export function Why() {
  return (
    <section className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <h2 className="font-[Amiri,serif] text-[26px] font-bold md:text-[32px]">لماذا خزف</h2>
      <div className="mt-5 flex flex-col gap-3 md:grid md:grid-cols-3">
        {[
          ["تحميص بدفعات صغيرة", "نحمّص كميات متكرّرة بدل تخزين كميات كبيرة على الرف"],
          ["مصادر محدّدة", "محاصيل نعرف مصدرها ومعالجتها — بلا خيارات مجهولة"],
          ["الدفع عند الاستلام", "افحص طلبك أمام المندوب قبل أن تدفع"],
        ].map(([t, d]) => (
          <div key={t} className="border-t border-line pt-4">
            <p className="text-[13.5px] font-bold">{t}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٨) مساعد الاختيار ═══ */
export function Assistant({ children }: { children?: React.ReactNode }) {
  return (
    <section id="finder" className="mx-auto max-w-lg px-5 pt-12 md:max-w-4xl md:px-8">
      <div className="rounded-[18px] border border-clay/30 bg-clay/5 p-7">
        <h2 className="font-[Amiri,serif] text-[24px] font-bold">ما تعرف شنو تختار؟</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          اختر ذوقك ونساعدك توصل للمحصول الأقرب لك
        </p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}
