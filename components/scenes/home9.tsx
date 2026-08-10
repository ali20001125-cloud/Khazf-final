"use client";
/**
 * الرئيسية — «البلاط»
 * الفكرة: اسم البراند خزف (فخّار)، وشعاره زخرفة خزفية شرقية.
 * فالصفحة شبكة بلاط: خطوط فاصلة رفيعة كخطوط الجصّ، حواف حادّة (٤px)،
 * ونجمة ثمانية من الشعار كعلامة أقسام.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig } from "@/lib/store";
import { formatIQD } from "@/lib/data";

/* عنوان علوي إنجليزي — بلا رموز */
function Eyebrow({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <span className={`font-num block text-[10px] font-bold tracking-[0.28em] ${light ? "text-gold" : "text-clay"}`}>
      {label}
    </span>
  );
}

/* ═══ ١) البطل ═══ */
export function Hero() {
  const { coffees } = useCatalog();
  const rated = coffees.filter((c) => c.reviewsCount > 0);
  const total = rated.reduce((t, c) => t + c.reviewsCount, 0);
  const avg = total > 0 ? (rated.reduce((t, c) => t + c.rating * c.reviewsCount, 0) / total).toFixed(1) : null;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-4xl px-5 pb-8 pt-8 md:px-8 md:pb-12 md:pt-14">
        <Eyebrow label="KHAZF · BAGHDAD" />
        <h1 className="khz-in mt-5 font-[Amiri,serif] text-[36px] font-bold leading-[1.22] md:text-[58px]">
          قهوتك،<br />من أول رشفة
        </h1>
        <p className="khz-in khz-in-1 mt-4 max-w-md text-[13.5px] leading-[1.95] text-muted md:text-[15px]">
          محاصيل محدّدة المصدر، نحمّصها بدفعات صغيرة وتصلك بابك خلال يوم إلى يومين.
        </p>

        <div className="khz-in khz-in-2 mt-6 flex flex-wrap gap-px bg-line">
          <Link href="/products/?cat=coffee"
            className="flex min-h-[52px] flex-1 items-center justify-center bg-olive px-7 text-[14.5px] font-bold text-olive-text transition-all hover:brightness-110 active:scale-[0.99]"
            style={{ borderRadius: 4 }}>
            تصفّح المحاصيل
          </Link>
          <Link href="/box/"
            className="flex min-h-[52px] flex-1 items-center justify-center border border-ink bg-bg px-7 text-[14.5px] font-bold transition-colors hover:bg-bg-alt active:scale-[0.99]"
            style={{ borderRadius: 4 }}>
            ابنِ بوكسك
          </Link>
        </div>

        {avg && (
          <p className="mt-5 flex items-center gap-2 text-[12px] text-muted">
            <span className="font-num font-bold text-ink">{avg}</span>
            <span className="text-gold">★★★★★</span>
            <span>من {total} تقييم</span>
          </p>
        )}
      </div>
    </section>
  );
}

/* ═══ ٢) شريط الثقة — بلاطات ═══ */
export function TrustBar() {
  const config = useSiteConfig();
  return (
    <section className="border-b border-line bg-bg-alt">
      <div className="mx-auto grid max-w-4xl grid-cols-3 gap-px bg-line">
        {[
          "توصيل ١–٢ يوم",
          "الدفع عند الاستلام",
          `${config.cashbackPct ?? 3}٪ نقاط ولاء`,
        ].map((t) => (
          <div key={t} className="bg-bg-alt px-3 py-3.5 text-center">
            <p className="text-[11.5px] font-semibold leading-tight">{t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٣) المحاصيل ═══ */
export function Crops() {
  const { coffees } = useCatalog();
  const list = coffees.filter((c) => !c.soldOut);
  if (list.length === 0) return null;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Eyebrow label="THE CROPS" />
            <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold md:text-[36px]">المحاصيل</h2>
          </div>
          <Link href="/products/?cat=coffee" className="shrink-0 text-[12.5px] font-bold text-accent">
            الكل ←
          </Link>
        </div>

        <div className="no-scrollbar -mx-5 mt-7 flex snap-x snap-mandatory gap-px overflow-x-auto bg-line px-5 md:mx-0 md:grid md:grid-cols-3 md:px-0">
          {list.map((c, i) => (
            <Link key={c.slug} href={`/product/?c=${c.slug}`}
              className="group w-[74%] shrink-0 snap-start bg-bg transition-colors hover:bg-card md:w-auto">
              <div className="relative aspect-square overflow-hidden bg-bg-alt">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <span className="font-[Amiri,serif] text-[15px] text-muted">{c.name}</span>
                  </span>
                )}
                {i === 0 && (
                  <span className="absolute end-0 top-0 bg-ink px-2.5 py-1.5 text-[10px] font-bold text-bg">
                    الأكثر مبيعاً
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted">
                  {[c.country, c.process].filter(Boolean).join(" · ").toUpperCase()}
                </p>
                <h3 className="mt-2 font-[Amiri,serif] text-[22px] font-bold leading-tight">{c.name}</h3>
                {c.notes?.length > 0 && (
                  <p className="mt-2 text-[12px] leading-relaxed" style={{ color: c.accent }}>
                    {c.notes.join(" · ")}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
                  <span className="font-num text-[15px] font-bold">{formatIQD(c.prices.g250)}</span>
                  <span className="flex items-center gap-1 text-[12px] font-bold text-accent">
                    اكتشف المحصول
                    <span className="transition-transform group-hover:-translate-x-1">←</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {list.length > 2 && <p className="mt-3 text-[11.5px] text-muted md:hidden">اسحب لاكتشاف الباقي ←</p>}
      </div>
    </section>
  );
}

/* ═══ ٤) ابنِ بوكسك ═══ */
export function BuildBox() {
  const { coffees } = useCatalog();
  const shots = coffees.filter((c) => c.image).slice(0, 3);
  return (
    <section className="border-b border-line bg-olive text-olive-text">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <Eyebrow label="BUILD YOUR BOX" light />

        <h2 className="mt-5 font-[Amiri,serif] text-[30px] font-bold leading-[1.3] md:text-[42px]">
          اختَر أكثر.<br />وفّر أكثر.
        </h2>
        <p className="mt-4 max-w-md text-[13.5px] leading-[1.95] opacity-80">
          اجمع أكياسك في صندوق واحد وشاهد التوفير قبل أن تضيفه للسلة.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-px bg-white/15 md:max-w-lg md:grid-cols-3">
          {[["٢", "خصم ٤٪"], ["٣", "خصم ١٢٪ · ملعقة"], ["٤+", "خصم ٢٠٪ · كوب"]].map(([n, r], i) => (
            <div key={n} className={`px-5 py-4 ${i === 2 ? "bg-gold text-olive" : "bg-olive"}`}>
              <p className="font-num text-[22px] font-bold leading-none">{n}</p>
              <p className={`mt-2 text-[11.5px] ${i === 2 ? "font-bold" : "opacity-80"}`}>{r}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-6">
          <Link href="/box/"
            className="inline-flex min-h-[52px] items-center bg-gold px-8 text-[14.5px] font-bold text-olive transition-all hover:brightness-105 active:scale-[0.99]"
            style={{ borderRadius: 4 }}>
            ابدأ بناء البوكس ←
          </Link>

          {shots.length > 0 && (
            <div className="flex -space-x-3 rtl:space-x-reverse">
              {shots.map((c) => (
                <div key={c.slug} className="h-14 w-14 overflow-hidden border-2 border-olive bg-bg-alt" style={{ borderRadius: 4 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.image!} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٥) أكمِل تجربتك ═══ */
export function Gear() {
  const { activePlaces } = useCatalog();
  const cards = [
    { href: "/products/?cat=drip", t: "الأدوات", d: "فلاتر وسيرفرات وأقماع للتحضير", place: "drip_tools", n: "01" },
    { href: "/products/?cat=cups", t: "الأكواب", d: "قطع مختارة للقهوة اليومية", place: "cups", n: "02" },
    { href: "/box/", t: "الهدايا", d: "صندوق جاهز يصلح هديّة", place: null, n: "03" },
  ].filter((c) => !c.place || activePlaces.includes(c.place));
  if (cards.length === 0) return null;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <Eyebrow label="BEYOND THE BEAN" />
        <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold md:text-[36px]">أكمِل تجربتك</h2>

        <div className="mt-7 grid grid-cols-1 gap-px bg-line md:grid-cols-3">
          {cards.map(({ href, t, d, n }) => (
            <Link key={t} href={href}
              className="group relative flex min-h-[150px] flex-col justify-between overflow-hidden bg-bg p-6 transition-colors hover:bg-card">
              <span className="font-num absolute -top-3 start-3 text-[64px] font-bold leading-none text-line/70 transition-colors group-hover:text-clay/15">
                {n}
              </span>
              <div className="relative">
                <p className="font-[Amiri,serif] text-[24px] font-bold leading-tight">{t}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{d}</p>
              </div>
              <span className="relative mt-5 flex items-center gap-1.5 text-[12.5px] font-bold text-accent">
                تصفّح <span className="transition-transform group-hover:-translate-x-1.5">←</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٦) لماذا خزف ═══ */
export function Why() {
  return (
    <section className="border-b border-line bg-bg-alt">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <Eyebrow label="OUR PROMISE" />
        <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold md:text-[36px]">لماذا خزف</h2>

        <div className="mt-7 grid grid-cols-1 gap-px bg-line md:grid-cols-3">
          {[
            ["تحميص بدفعات صغيرة", "نحمّص كميات متكرّرة بدل تخزين كميات كبيرة على الرف."],
            ["مصادر محدّدة", "محاصيل نعرف مصدرها ومعالجتها — بلا خيارات مجهولة."],
            ["الدفع عند الاستلام", "افحص طلبك أمام المندوب قبل أن تدفع."],
          ].map(([t, d]) => (
            <div key={t} className="bg-bg-alt px-5 py-6">
              <p className="text-[14px] font-bold">{t}</p>
              <p className="mt-2 text-[12px] leading-[1.9] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ ٧) التقييمات ═══ */
export function Reviews() {
  const { coffees, brandReviews } = useCatalog();
  const rated = coffees.filter((c) => c.reviewsCount > 0);
  const total = rated.reduce((t, c) => t + c.reviewsCount, 0);
  const avg = total > 0 ? (rated.reduce((t, c) => t + c.rating * c.reviewsCount, 0) / total).toFixed(1) : null;
  const quotes = brandReviews ?? [];
  if (total < 3 && quotes.length === 0) return null;

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <Eyebrow label="REVIEWS" />
        <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold md:text-[36px]">آراء عملائنا</h2>

        {avg && total >= 3 && (
          <div className="mt-6 flex items-center gap-5">
            <p className="font-num text-[38px] font-bold leading-none">{avg}</p>
            <div className="border-s border-line ps-5">
              <p className="text-[14px] text-gold">★★★★★</p>
              <p className="font-num mt-1 text-[12px] text-muted">من {total} تقييم</p>
            </div>
          </div>
        )}

        {quotes.length > 0 && (
          <div className="mt-7 grid grid-cols-1 gap-px bg-line md:grid-cols-2">
            {quotes.slice(0, 4).map((q: { quote: string; author: string; context: string; rating: number }, i: number) => (
              <div key={i} className="bg-bg px-5 py-6">
                <p className="text-[13px] text-gold">{"★".repeat(q.rating)}</p>
                <p className="mt-2.5 text-[14px] leading-[1.9]">«{q.quote}»</p>
                {(q.author || q.context) && (
                  <p className="mt-3 text-[11.5px] text-muted">
                    {[q.author, q.context].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══ ٨) مساعد الاختيار ═══ */
export function Assistant({ children }: { children?: React.ReactNode }) {
  return (
    <section id="finder">
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <Eyebrow label="NOT SURE?" />
        <h2 className="mt-3.5 font-[Amiri,serif] text-[28px] font-bold md:text-[36px]">
          ما تعرف شنو تختار؟
        </h2>
        <p className="mt-3 max-w-md text-[13.5px] leading-[1.95] text-muted">
          اختر ذوقك ونساعدك توصل للمحصول الأقرب لك.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
