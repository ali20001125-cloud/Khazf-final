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
    .slice(0, compact ? 3 : 4)
    .map((x) => x.t);

  if (picks.length === 0) return null;

  return (
    <section className={compact ? "mt-5" : "mt-8"}>
      <div className="flex items-center gap-2">
        <Truck size={16} className="shrink-0 text-clay" />
        <p className="text-[13.5px] font-bold leading-snug">
          باقي لك <span className="font-num text-clay">{formatIQD(remaining)}</span> ويصير التوصيل مجانياً
        </p>
      </div>
      <p className="mt-1 text-[11.5px] text-muted">هذه تكمّل طلبك — وتصل معه بلا أجرة إضافية</p>

      <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
        {picks.map((t) => {
          const hits = (t.price ?? 0) >= remaining;
          return (
            <div key={t.slug}
              className={`w-[42%] max-w-[168px] shrink-0 overflow-hidden rounded-[14px] border bg-card ${
                hits ? "border-clay/45" : "border-line"
              }`}>
              <Link href={`/product/?t=${t.slug}`} className="block aspect-square bg-white">
                {t.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.images[0]} alt={t.name} className="h-full w-full object-cover" />
                ) : <span className="flex h-full items-center justify-center bg-bg-alt text-[11px] text-muted">{t.name}</span>}
              </Link>
              <div className="p-2.5">
                <p className="truncate text-[12.5px] font-bold">{t.name}</p>
                {hits && <p className="mt-0.5 text-[10.5px] font-bold text-ok">يكفي للتوصيل المجاني</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="font-num text-[12.5px] font-bold">{formatIQD(t.price ?? 0)}</p>
                  <button
                    onClick={() => {
                      addToCart({ slug: t.slug, variant: "PIECE", grind: "", name: t.name, meta: "", priceShown: t.price ?? 0 });
                      showToast("أُضيف للسلة");
                    }}
                    aria-label={`أضف ${t.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-[16px] font-normal text-white transition-transform active:scale-90">
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
