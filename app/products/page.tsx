"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ChevronLeft } from "lucide-react";
import { type ToolCat, type Coffee, type Tool } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { CoffeeCard, ToolCard } from "@/components/Cards";
import { useMotion, reduced } from "@/lib/motion";

type Tab = "all" | "coffee" | "espresso" | "drip";
type Sort = "new" | "best" | "price";

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "coffee", label: "القهوة" },
  { key: "espresso", label: "أدوات الإسبريسو" },
  { key: "drip", label: "أدوات التقطير" },
];
const tabCat: Record<"espresso" | "drip", ToolCat> = { espresso: "إسبريسو", drip: "تقطير" };
const sorts: { key: Sort; label: string }[] = [
  { key: "new", label: "الأحدث" },
  { key: "best", label: "الأكثر مبيعاً" },
  { key: "price", label: "السعر" },
];

type Item = ({ kind: "c" } & Coffee) | ({ kind: "t" } & Tool);

function ShopInner() {
  const { coffees, tools, toolsEnabled } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const scope = useMotion();
  const gridRef = useRef<HTMLDivElement>(null);

  const tab = (["all", "coffee", "espresso", "drip"].includes(params.get("cat") ?? "")
    ? params.get("cat")
    : "all") as Tab;
  const type = params.get("type") ?? "الكل";
  const sort = (["new", "best", "price"].includes(params.get("sort") ?? "")
    ? params.get("sort")
    : "new") as Sort;

  /* التنقّل يعدّل الرابط — نفس الصفحة، فلاتر مختلفة */
  const go = (next: { cat?: Tab; type?: string; sort?: Sort }) => {
    const p = new URLSearchParams();
    p.set("cat", next.cat ?? tab);
    const ty = next.cat && next.cat !== tab ? "الكل" : (next.type ?? type);
    if (ty !== "الكل") p.set("type", ty);
    p.set("sort", next.sort ?? sort);
    router.push(`/products/?${p.toString()}`);
  };

  /* الأنواع الفرعية حسب التبويب الحالي */
  const subTypes = useMemo(() => {
    if (tab === "coffee") return ["الكل", ...new Set(coffees.map((c) => c.country))];
    if (tab === "espresso" || tab === "drip")
      return ["الكل", ...new Set(tools.filter((t) => t.cats.includes(tabCat[tab])).map((t) => t.type))];
    return [];
  }, [tab]);

  /* القائمة النهائية */
  const list = useMemo<Item[]>(() => {
    let items: Item[] = [];
    if (tab === "all")
      items = [
        ...coffees.map((c) => ({ kind: "c" as const, ...c })),
        ...tools.map((t) => ({ kind: "t" as const, ...t })),
      ];
    else if (tab === "coffee")
      items = coffees
        .filter((c) => type === "الكل" || c.country === type)
        .map((c) => ({ kind: "c" as const, ...c }));
    else
      items = tools
        .filter((t) => t.cats.includes(tabCat[tab]))
        .filter((t) => type === "الكل" || t.type === type)
        .map((t) => ({ kind: "t" as const, ...t }));

    const price = (i: Item) => (i.kind === "c" ? i.prices.g250 : i.price);
    if (sort === "price") items.sort((a, b) => price(a) - price(b));
    if (sort === "best") items.sort((a, b) => b.reviewsCount - a.reviewsCount);
    if (sort === "new")
      items.sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false));
    return items;
  }, [tab, type, sort]);

  /* ظهور متدرّج سريع عند أي تغيير */
  useEffect(() => {
    if (!gridRef.current || reduced()) return;
    gsap.fromTo(
      gridRef.current.children,
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.05 }
    );
  }, [tab, type, sort]);

  const crumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "المتجر", href: "/products/?cat=all" },
    ...(tab !== "all" ? [{ label: tabs.find((t) => t.key === tab)!.label, href: `/products/?cat=${tab}` }] : []),
    ...(type !== "الكل" ? [{ label: type, href: "" }] : []),
  ];

  return (
    <div ref={scope} className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8 md:pt-32">
      {/* Breadcrumb */}
      <nav className="reveal flex flex-wrap items-center gap-1 text-[12px] text-muted">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronLeft size={13} className="opacity-50" />}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-accent">{c.label}</Link>
            ) : (
              <span className="font-semibold text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <h1 className="reveal mt-3 text-3xl font-bold md:text-4xl">المتجر</h1>

      {/* التبويبات الرئيسية */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => go({ cat: t.key, type: "الكل" })}
            className={`shrink-0 rounded-[14px] px-5 py-3 text-[14px] font-bold transition-colors md:px-6 ${
              tab === t.key ? "bg-olive text-olive-text" : "bg-card text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href="/box/"
          className="shrink-0 rounded-[14px] bg-card px-5 py-3 text-[14px] font-bold text-muted transition-colors hover:text-ink md:px-6"
        >
          بناء البوكس
        </Link>
      </div>

      {/* الفلاتر الفرعية للقسم الحالي */}
      {subTypes.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {subTypes.map((tp) => (
            <button
              key={tp}
              onClick={() => go({ type: tp })}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
                type === tp
                  ? "border-accent bg-accent text-olive-text"
                  : "border-line bg-card text-muted hover:text-ink"
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      )}

      {/* شريط النتائج + الفرز */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="font-num text-[13px] font-semibold text-muted">
          {list.length} منتجاً
        </p>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-muted">ترتيب:</span>
          <select
            value={sort}
            onChange={(e) => go({ sort: e.target.value as Sort })}
            aria-label="ترتيب حسب"
            className="rounded-full border border-line bg-card px-4 py-2 text-[12.5px] font-bold outline-none"
          >
            {sorts.map((x) => <option key={x.key} value={x.key}>ترتيب: {x.label}</option>)}
          </select>
        </div>
      </div>

      {/* الشبكة */}
      <div ref={gridRef} className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {list.map((item) =>
          item.kind === "c" ? (
            <CoffeeCard key={`c-${item.slug}`} coffee={item} />
          ) : (
            <ToolCard key={`t-${item.slug}`} tool={item} />
          )
        )}
      </div>

      {list.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">لا نتائج بهذا الفلتر</p>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ShopInner />
    </Suspense>
  );
}
