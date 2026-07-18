"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, BookOpen, Timer } from "lucide-react";
import { articles, type ToolCat } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { CoffeeCard, ToolCard } from "@/components/Cards";
import { Hero, StatementBanner, CropsRail, BoxTeaser } from "./home3";

export { Hero, StatementBanner, CropsRail, BoxTeaser };

/* رأس قسم موحّد مع "عرض المزيد" */
function SectionHead({ title, sub, href }: { title: string; sub?: string; href: string }) {
  return (
    <div className="reveal mb-8 flex items-end justify-between">
      <div>
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
      </div>
      <Link href={href} className="flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-soft">
        عرض المزيد <ArrowLeft size={15} />
      </Link>
    </div>
  );
}

/* ═══ شريط المعلومات ═══ */
export function InfoBar() {
  const items = [
    { t: "توصيل لكل المحافظات", e: "٢–٤ أيام" },
    { t: "نحمّص باستمرار", e: "تاريخ التحميص على الكيس" },
    { t: "قهوة مختصة", e: "SCA +٨٠" },
    { t: "كاش باك ٣٪", e: "مع كل طلب" },
  ];
  return (
    <section className="border-y border-line bg-bg-alt/60">
      <div className="reveal-group mx-auto grid max-w-6xl grid-cols-2 gap-x-4 gap-y-5 px-5 py-6 md:grid-cols-4 md:px-8">
        {items.map((i) => (
          <div key={i.t} className="text-center">
            <p className="text-[13px] font-bold">{i.t}</p>
            <p className="font-num mt-0.5 text-[11px] text-muted">{i.e}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ قسم أدوات (يُستخدم للإسبريسو والتقطير) ═══ */
export function ToolsSection({
  cat,
  title,
  sub,
  href,
}: {
  cat: ToolCat;
  title: string;
  sub: string;
  href: string;
}) {
  const { tools } = useCatalog();
  const list = tools.filter((t) => t.cats.includes(cat)).slice(0, 4);
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
      <SectionHead title={title} sub={sub} href={href} />
      <div className="reveal-group grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {list.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </section>
  );
}

/* ═══ وصل حديثاً ═══ */
export function NewArrivals() {
  const { coffees, tools } = useCatalog();
  const items = [
    ...coffees.filter((c) => c.isNew),
    ...tools.filter((t) => t.isNew),
    ...coffees.filter((c) => !c.isNew).slice(0, 2),
  ];
  return (
    <section id="new" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:px-8">
      <SectionHead title="وصل حديثاً" sub="آخر إضافات خزف" href="/products/" />
      <div className="reveal no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        {items.map((item) => (
          <div key={item.slug} className="w-[210px] shrink-0">
            {"prices" in item ? (
              <CoffeeCard coffee={item} />
            ) : (
              <ToolCard tool={item} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ الأكثر مبيعاً ═══ */
export function BestSellers() {
  const { coffees, tools } = useCatalog();
  const items = [...coffees]
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, 2);
  const topTools = [...tools]
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, 2);
  return (
    <section className="bg-bg-alt/60 py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <SectionHead title="الأكثر مبيعاً" sub="اللي يرجعون له عملاؤنا" href="/products/" />
        <div className="reveal-group grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {items.map((c) => (
            <CoffeeCard key={c.slug} coffee={c} />
          ))}
          {topTools.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══ Journal + الوصفات ═══ */
export function JournalTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
      <SectionHead title="Coffee Journal" sub="مقالات ووصفات وأدلة — مرجعك بالقهوة" href="/journal/" />
      <div className="reveal-group grid gap-5 md:grid-cols-3">
        {articles.slice(0, 2).map((a) => (
          <Link
            key={a.slug}
            href={`/journal/?a=${a.slug}`}
            className="group rounded-[20px] border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5"
          >
            <span className="rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-muted">{a.tag}</span>
            <h3 className="mt-4 text-xl font-bold leading-snug">{a.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>
            <p className="font-num mt-4 text-[11px] text-muted">{a.minutes} دقائق قراءة</p>
          </Link>
        ))}

        {/* بطاقة الوصفات */}
        <Link
          href="/recipes/"
          className="group flex flex-col justify-between rounded-[20px] bg-olive p-6 text-olive-text transition-transform duration-300 hover:-translate-y-1"
        >
          <div>
            <Timer size={22} className="text-gold" />
            <h3 className="mt-4 text-xl font-bold leading-snug">الوصفات</h3>
            <p className="mt-2 text-[13px] leading-relaxed opacity-75">
              حاسبة تحضير: اختر طريقتك وكمية البن — الأرقام تتعدّل ومؤقت يقودك خطوة خطوة.
            </p>
          </div>
          <span className="mt-5 flex items-center gap-1.5 text-[13px] font-bold text-gold">
            افتح الوصفات <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          </span>
        </Link>
      </div>
    </section>
  );
}

/* ═══ ابدأ من هنا ═══ */
export function StartHere() {
  return (
    <section className="px-4 pb-20 md:px-8">
      <div className="reveal mx-auto flex max-w-6xl flex-col items-center gap-5 rounded-[26px] border border-line bg-card px-8 py-12 text-center md:flex-row md:justify-between md:text-start">
        <div>
          <p className="flex items-center justify-center gap-2 text-[12px] font-bold text-accent md:justify-start">
            <Sparkles size={14} /> للمبتدئين
          </p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">لا تعرف ماذا تختار؟</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            ٣ أسئلة قصيرة عن ذوقك وطريقتك… ونقترح لك المحصول والأدوات المناسبة بالضبط.
          </p>
        </div>
        <Link href="/start/" className="btn btn-clay magnetic shrink-0" data-strength="20">
          ابدأ من هنا
        </Link>
      </div>
    </section>
  );
}

/* ═══ دعوة Journal صغيرة داخل الفوتر السياقي ═══ */
export function ReadMore() {
  return (
    <div className="reveal mx-auto max-w-6xl px-4 md:px-8">
      <Link
        href="/journal/"
        className="flex items-center justify-center gap-2 rounded-[16px] border border-line py-3.5 text-[13px] font-bold text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <BookOpen size={15} /> كل المقالات في Coffee Journal
      </Link>
    </div>
  );
}
