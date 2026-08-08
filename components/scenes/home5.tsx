"use client";
/** أقسام الرئيسية — مبنية للتحويل: أقل قرارات، أقصر طريق للشراء */
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Search, Sparkles, Package, Gift, X } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useStore } from "@/lib/store";
import { formatIQD, type Coffee } from "@/lib/data";
import { CoffeeCard, ToolCard } from "@/components/Cards";
import LeadCapture from "@/components/LeadCapture";

/* ═══ ١) البطل: أكثر محصول طلباً — قابل للشراء فوراً ═══ */
export function HeroPick() {
  const { coffees } = useCatalog();
  const { addToCart, showToast } = useStore();
  const pick = coffees.find((c) => !c.soldOut) ?? coffees[0];
  if (!pick) return null;

  const add = () => {
    addToCart({
      slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
      name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
    });
    showToast("أُضيف للسلة");
  };

  return (
    <section className="mx-auto max-w-lg px-4 pt-7 md:max-w-5xl md:px-8">
      <Link href={`/product/?c=${pick.slug}`}
        className="group block overflow-hidden rounded-[20px] border border-line bg-card transition-all active:scale-[0.995]">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-bg-alt md:aspect-[21/9]">
          {pick.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pick.image} alt={pick.name} className="h-full w-full object-cover" />
          ) : null}
          <span className="absolute end-3 top-3 rounded-full bg-bg/92 px-3 py-1.5 text-[10.5px] font-bold text-ink backdrop-blur-sm">
            الأكثر طلباً
          </span>
        </div>
        <div className="p-4">
          <p className="font-[Amiri,serif] text-[21px] font-bold leading-tight">{pick.name}</p>
          {pick.notes?.length > 0 && (
            <p className="mt-1 text-[12px] font-semibold" style={{ color: pick.accent }}>
              {pick.notes.join(" · ")}
            </p>
          )}
          <p className="mt-1 text-[11.5px] text-muted">
            {[pick.country, pick.roast && `تحميص ${pick.roast}`].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-3.5 flex items-center justify-between gap-3">
            <p className="font-num text-[18px] font-bold">{formatIQD(pick.prices.g250)}</p>
            <button
              onClick={(e) => { e.preventDefault(); add(); }}
              disabled={pick.soldOut}
              className="btn btn-clay shrink-0 !px-6 !py-2.5 text-[13.5px] active:scale-95 disabled:opacity-50">
              {pick.soldOut ? "نفد" : "أضف للسلة"}
            </button>
          </div>
        </div>
      </Link>
    </section>
  );
}

/* ═══ ٢) المسارات الثلاثة: تحسم حيرة الزائر ═══ */
export function PathCards({ children }: { children?: React.ReactNode }) {
  const paths = [
    { href: "/products/?cat=coffee", Icon: Search, t: "أعرف ما أريد", d: "تصفّح كل المحاصيل والأدوات", hot: false },
    { href: "/box/", Icon: Package, t: "أريد أكثر من كيس", d: "كيسان يوفّران ٤٪ · وأربعة ٢٠٪ وهدية", hot: false },
  ];
  return (
    <section className="mx-auto max-w-lg px-4 pt-11 md:max-w-5xl md:px-8">
      <h2 className="mb-3 text-[18px] font-bold text-ink">كيف نساعدك؟</h2>
      {children}
      <div className="mt-2.5 flex flex-col gap-2.5 md:grid md:grid-cols-2">
        {paths.map(({ href, Icon, t, d, hot }) => (
          <Link key={t} href={href}
            className={`flex items-center gap-3.5 rounded-[16px] border p-4 transition-all active:scale-[0.99] ${
              hot ? "border-clay bg-clay/5" : "border-line bg-card"
            }`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${
              hot ? "bg-clay/14 text-clay" : "bg-bg-alt text-muted"
            }`}>
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold">{t}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">{d}</span>
            </span>
            <ArrowLeft size={15} className={hot ? "shrink-0 text-clay" : "shrink-0 text-muted"} />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٣) المحاصيل ═══ */
export function CropsGrid() {
  const { coffees } = useCatalog();
  if (coffees.length === 0) return null;
  return (
    <section className="mx-auto max-w-lg px-4 pt-11 md:max-w-5xl md:px-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-bold text-ink">المحاصيل</h2>
        <Link href="/products/?cat=coffee" className="flex items-center gap-1 text-[12.5px] font-bold text-accent">
          الكل <ArrowLeft size={13} />
        </Link>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {coffees.slice(0, 4).map((c) => <CoffeeCard key={c.slug} coffee={c} />)}
      </div>
    </section>
  );
}

/* ═══ ٤) البوكس ═══ */
export function BoxBlock() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-11 md:max-w-5xl md:px-8">
      <div className="rounded-[20px] bg-olive p-6 text-olive-text md:p-8">
        <div className="flex items-center gap-2">
          <Gift size={17} className="text-gold" />
          <p className="text-[11.5px] font-bold tracking-wide opacity-80">اصنع صندوقك</p>
        </div>
        <h2 className="mt-2.5 text-[21px] font-bold leading-snug md:text-[25px]">
          كل كيس تضيفه<br className="md:hidden" /> يكبّر مكافأتك
        </h2>
        <div className="mt-5 space-y-0 md:max-w-md">
          {[["كيسان", "خصم ٤٪"], ["٣ أكياس", "خصم ١٢٪ + ملعقة"], ["٤ أكياس فأكثر", "خصم ٢٠٪ + كوب"]].map(([n, r], i) => (
            <div key={n} className={`flex justify-between py-2.5 text-[13px] ${i < 2 ? "border-b border-olive-text/15" : ""}`}>
              <span className="opacity-85">{n}</span>
              <span className={i === 2 ? "font-bold text-gold" : "opacity-75"}>{r}</span>
            </div>
          ))}
        </div>
        <Link href="/box/"
          className="mt-5 block rounded-[13px] bg-gold py-3.5 text-center text-[14px] font-bold text-olive transition-transform active:scale-[0.98] md:inline-block md:px-10">
          ابدأ صندوقك
        </Link>
      </div>
    </section>
  );
}

/* ═══ ٥) الأدوات والأكواب ═══ */
export function GearRail({ cat, title, href }: { cat: string; title: string; href: string }) {
  const { tools } = useCatalog();
  const list = tools.filter((t) => t.cats.includes(cat as never)).slice(0, 6);
  if (list.length === 0) return null;
  return (
    <section className="mx-auto max-w-lg px-4 pt-11 md:max-w-5xl md:px-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        <Link href={href} className="flex items-center gap-1 text-[12.5px] font-bold text-accent">
          الكل <ArrowLeft size={13} />
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 mt-3.5 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {list.map((t) => (
          <div key={t.slug} className="w-[44%] max-w-[190px] shrink-0 md:w-auto md:max-w-none">
            <ToolCard tool={t} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ ٦) قبل الفوتر: التقاط من لم يشترِ ═══ */
export function BeforeFooter() {
  return (
    <section className="mx-auto max-w-lg px-4 pt-12 md:max-w-5xl md:px-8">
      <div className="rounded-[20px] border border-line bg-bg-alt p-6 text-center md:p-8">
        <p className="font-[Amiri,serif] text-[21px] font-bold leading-snug md:text-[24px]">
          لم تقرّر بعد؟
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
          خذ دليل التحضير مجاناً — النِّسب والخطوات التي نعتمدها في خزف، على بريدك.
        </p>
        <div className="mx-auto mt-4 max-w-sm">
          <LeadCapture source="guide" compact />
        </div>
      </div>
    </section>
  );
}

/* ═══ ٧) الطمأنة ═══ */
export function TrustRow() {
  const items = [
    ["تحميص حديث", "دفعات صغيرة"],
    ["١–٢ يوم", "لكل العراق"],
    ["٣٪ كاش باك", "يعود إليك"],
  ];
  return (
    <section className="mt-12 border-y border-line">
      <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-line rtl:divide-x-reverse">
        {items.map(([t, d]) => (
          <div key={t} className="px-3 py-5 text-center">
            <p className="text-[12.5px] font-bold">{t}</p>
            <p className="mt-1 text-[10.5px] text-muted">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export type { Coffee };
