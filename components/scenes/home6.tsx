"use client";
/** الرئيسية — نمط المتجر المباشر: المنتجات أولاً، والشرح آخراً */
import Link from "next/link";
import { ArrowLeft, Package, Wallet, Gift, Search, Sparkles, Coffee, Beaker, CupSoda } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useStore, useSiteConfig } from "@/lib/store";
import { formatIQD } from "@/lib/data";
import { CoffeeCard } from "@/components/Cards";

/* ═══ ١) المحاصيل — أول ما يُرى ═══ */
export function CropsFirst() {
  const { coffees } = useCatalog();
  const list = coffees.filter((c) => !c.soldOut);
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-lg px-4 pt-5 md:max-w-5xl md:px-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-[Amiri,serif] text-[24px] font-bold">محاصيلنا</h1>
        <Link href="/products/?cat=coffee" className="flex items-center gap-1 text-[12.5px] font-bold text-accent">
          الكل <ArrowLeft size={13} />
        </Link>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {list.slice(0, 4).map((c) => <CoffeeCard key={c.slug} coffee={c} />)}
      </div>
    </section>
  );
}

/* ═══ ٢) شريط البوكس ═══ */
export function BoxStrip() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-6 md:max-w-5xl md:px-8">
      <Link href="/box/"
        className="flex items-center gap-3.5 rounded-[16px] bg-olive p-4 text-olive-text transition-all active:scale-[0.99] md:p-5">
        <Gift size={20} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold">اصنع صندوقك ووفّر حتى ٢٠٪</p>
          <p className="mt-0.5 text-[11.5px] opacity-80">كيسان ٤٪ · ثلاثة ١٢٪ مع ملعقة · أربعة ٢٠٪ مع كوب</p>
        </div>
        <ArrowLeft size={16} className="shrink-0 text-gold" />
      </Link>
    </section>
  );
}

/* ═══ ٣) تسوّق حسب القسم ═══ */
export function ShopByCategory() {
  const { activePlaces } = useCatalog();
  const cats = [
    { href: "/products/?cat=coffee", Icon: Coffee, t: "المحاصيل", d: "قهوة مختصة محدّدة المصدر", place: null },
    { href: "/products/?cat=drip", Icon: Beaker, t: "أدوات التقطير", d: "أقماع · فلاتر · سيرفرات", place: "drip_tools" },
    { href: "/products/?cat=cups", Icon: CupSoda, t: "الأكواب والتقديم", d: "سيراميك · زجاج · أطقم", place: "cups" },
    { href: "/box/", Icon: Package, t: "اصنع صندوقك", d: "اخلط محاصيلك ووفّر", place: null },
  ].filter((c) => !c.place || activePlaces.includes(c.place));

  return (
    <section className="mx-auto max-w-lg px-4 pt-9 md:max-w-5xl md:px-8">
      <h2 className="text-[17px] font-bold">تسوّق حسب القسم</h2>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {cats.map(({ href, Icon, t, d }) => (
          <Link key={t} href={href}
            className="flex flex-col gap-2 rounded-[14px] border border-line bg-card p-4 transition-all active:scale-[0.98]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-bg-alt text-clay">
              <Icon size={17} />
            </span>
            <span className="text-[13.5px] font-bold">{t}</span>
            <span className="text-[11px] leading-snug text-muted">{d}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٤) اكتشف عروضنا ═══ */
export function OffersBlock() {
  const config = useSiteConfig();
  const items = [
    { Icon: Package, t: "خصم البوكس", d: "كيسان ٤٪ · ثلاثة ١٢٪ · أربعة ٢٠٪", href: "/box/" },
    { Icon: Wallet, t: `${config.cashbackPct ?? 3}٪ نقاط`, d: "تعود إليك خصماً في طلبك القادم", href: "/cashback/" },
    { Icon: Gift, t: "رحلة المكافآت", d: "ستّ طلبات آخرها كيس مجاني", href: "/account/" },
  ];
  return (
    <section className="mx-auto max-w-lg px-4 pt-9 md:max-w-5xl md:px-8">
      <h2 className="text-[17px] font-bold">اكتشف عروضنا</h2>
      <div className="mt-3.5 flex flex-col gap-2.5 md:grid md:grid-cols-3">
        {items.map(({ Icon, t, d, href }) => (
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

/* ═══ ٥) لماذا خزف ═══ */
export function WhyKhazf() {
  const rows = [
    ["تحميص بدفعات صغيرة", "نحمّص كميات صغيرة متكرّرة — لا تخزين على الرف"],
    ["محدّدة المصدر", "محاصيل من مناطق نعرفها — لا خلطات مجهولة"],
    ["الدفع عند الاستلام", "افحص طلبك أمام المندوب قبل أن تدفع"],
  ];
  return (
    <section className="mx-auto max-w-lg px-4 pt-9 md:max-w-5xl md:px-8">
      <h2 className="text-[17px] font-bold">لماذا خزف</h2>
      <div className="mt-3.5 flex flex-col gap-3 md:grid md:grid-cols-3">
        {rows.map(([t, d]) => (
          <div key={t} className="rounded-[14px] border border-line bg-card p-4">
            <p className="text-[13.5px] font-bold">{t}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٦) كيف نساعدك — آخر الصفحة ═══ */
export function HelpLast({ children }: { children?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-lg px-4 pt-10 md:max-w-5xl md:px-8">
      <h2 className="text-[17px] font-bold">ما زلت متردّداً؟</h2>
      <p className="mt-1 text-[12.5px] text-muted">نساعدك تختار ما يناسب ذوقك</p>
      <div className="mt-3.5">{children}</div>
      <Link href="/products/"
        className="mt-2.5 flex items-center gap-3.5 rounded-[16px] border border-line bg-card p-4 transition-all active:scale-[0.99]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-bg-alt text-muted">
          <Search size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold">تصفّح كل شيء</span>
          <span className="mt-0.5 block text-[11.5px] text-muted">المحاصيل والأدوات والأكواب</span>
        </span>
        <ArrowLeft size={15} className="shrink-0 text-muted" />
      </Link>
    </section>
  );
}

export { Sparkles };
