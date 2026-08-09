"use client";
/** مقترحات تكمّل السلة — تُرشّح منتجات بسعر يقارب المتبقّي لعتبة التوصيل المجاني */
import Link from "next/link";
import { Truck } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { useStore, useSiteConfig } from "@/lib/store";
import { formatIQD } from "@/lib/data";

export default function CompleteCart({
  subtotal, compact = false,
}: { subtotal: number; compact?: boolean }) {
  const { tools } = useCatalog();
  const { addToCart, showToast } = useStore();
  const config = useSiteConfig();

  const threshold = config.freeDeliveryThreshold ?? 0;
  const remaining = threshold - subtotal;
  if (threshold <= 0 || remaining <= 0 || subtotal <= 0) return null;

  /* المرشّحون: أدوات متاحة بسعر معقول، والأقرب للمتبقّي أولاً */
  const picks = tools
    .filter((t) => !t.soldOut && (t.price ?? 0) > 0)
    .map((t) => ({ t, gap: Math.abs((t.price ?? 0) - remaining) }))
    .sort((a, b) => {
      // نفضّل ما يبلغ العتبة فعلاً، ثم الأقرب سعراً
      const aHits = (a.t.price ?? 0) >= remaining ? 0 : 1;
      const bHits = (b.t.price ?? 0) >= remaining ? 0 : 1;
      if (aHits !== bHits) return aHits - bHits;
      return a.gap - b.gap;
    })
    .slice(0, 6)
    .map((x) => x.t);

  if (picks.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        <Truck size={16} className="shrink-0 text-clay" />
        <p className="text-[13.5px] font-bold leading-snug">
          باقي لك <span className="font-num text-clay">{formatIQD(remaining)}</span> ويصير التوصيل مجانياً
        </p>
      </div>
      

      <div className="no-scrollbar mt-3 flex w-full gap-2 overflow-x-auto pb-1">
        {picks.map((t) => {
          const hits = (t.price ?? 0) >= remaining;
          return (
            <div key={t.slug}
              className={`flex w-[128px] shrink-0 flex-col overflow-hidden rounded-[11px] border bg-card ${
                hits ? "border-clay/45" : "border-line"}`}>
              <Link href={`/product/?t=${t.slug}`} className="block aspect-square bg-white">
                {t.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.images[0]} alt={t.name} className="h-full w-full object-cover" />
                ) : <span className="flex h-full items-center justify-center bg-bg-alt text-[10px] text-muted">{t.name}</span>}
              </Link>
              <div className="flex flex-1 flex-col p-2">
                <p className="truncate text-[11.5px] font-semibold">{t.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <p className="font-num text-[11.5px] font-bold">{formatIQD(t.price ?? 0)}</p>
                  <button
                    onClick={() => {
                      addToCart({ slug: t.slug, variant: "PIECE", grind: "", name: t.name, meta: "", priceShown: t.price ?? 0 });
                      showToast("أُضيف للسلة");
                    }}
                    aria-label={`أضف ${t.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay text-[15px] font-normal leading-none text-white transition-transform active:scale-90">
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
