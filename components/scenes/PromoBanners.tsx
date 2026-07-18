"use client";

/** بنرات الحملات من اللوحة — تظهر تحت الهيرو فقط حين توجد حملة بزر */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";

export default function PromoBanners() {
  const { banners } = useCatalog();
  const promos = banners.filter((b) => b.promoText && b.promoLink);
  if (promos.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 md:px-8">
      {promos.map((b, i) => (
        <Link key={i} href={b.promoLink!}
          className="mb-3 flex items-center justify-between gap-4 rounded-[18px] bg-olive px-6 py-4 text-olive-text transition-transform hover:-translate-y-0.5">
          <span className="text-[14px] font-bold md:text-[15px]">{b.text}</span>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-[12px] font-bold text-olive">
            {b.promoText} <ArrowLeft size={13} />
          </span>
        </Link>
      ))}
    </section>
  );
}
