"use client";
/**
 * اختيار خزف لك — بطاقة مدمجة لمنتج واحد ندفعه للواجهة (تحت الهيرو).
 * خفيفة وفاتحة، لا تملأ الشاشة — صورة صغيرة + اسم + trigger + شراء مباشر.
 * تجريبية على staging — تُنقل لـ main بعد الرضا.
 *
 * لتثبيت منتج بعينه: ضع slug القهوة في FEATURED_SLUG.
 * فارغ = يختار تلقائياً الأقل تقييماً.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";
import ProductJsonLd from "@/components/ProductJsonLd";

const FEATURED_SLUG: string = "dorado";

export function FeaturedPick() {
  const { coffees } = useCatalog();
  const { addToCart, showToast } = useStore();

  const available = coffees.filter((c) => !c.soldOut && c.image);
  if (available.length === 0) return null;

  const pinned = FEATURED_SLUG
    ? available.find((c) => c.slug.toLowerCase() === FEATURED_SLUG.toLowerCase())
    : null;
  const pick = pinned ?? [...available].sort((a, b) => a.reviewsCount - b.reviewsCount)[0];
  if (!pick) return null;

  const specs = [pick.country, pick.process].filter(Boolean).join(" · ").toUpperCase();

  return (
    <section className="border-b border-line bg-bg-alt" aria-labelledby="featured-pick-name">
      <ProductJsonLd
        name={pick.name}
        description={pick.desc || pick.notes?.join("، ")}
        image={pick.image ?? undefined}
        slug={pick.slug}
        price={pick.prices.g250}
        inStock={!pick.soldOut}
        rating={pick.reviewsCount > 0 ? pick.rating : undefined}
        reviewsCount={pick.reviewsCount || undefined}
      />
      <div className="mx-auto max-w-4xl px-5 py-7 md:px-8 md:py-8">
        <span className="font-num block text-[10px] font-bold tracking-[0.26em] text-clay">
          اختيار خزف لك
        </span>

        <div className="mt-3.5 flex items-stretch gap-3.5 border border-line bg-bg p-3 md:gap-5 md:p-4" style={{ borderRadius: 6 }}>
          {/* الصورة — صغيرة */}
          <Link
            href={`/product/?c=${pick.slug}`}
            className="group relative block h-24 w-24 shrink-0 overflow-hidden bg-bg-alt md:h-32 md:w-32"
            style={{ borderRadius: 4 }}
            aria-label={pick.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pick.image!}
              alt={`${pick.name} — ${(pick.notes ?? []).slice(0, 3).join("، ")}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          </Link>

          {/* المعلومات */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            {specs && (
              <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted">{specs}</p>
            )}
            <h2 id="featured-pick-name" className="font-[Amiri,serif] text-[22px] font-bold leading-tight md:text-[26px]">
              {pick.name}
            </h2>

            {pick.trigger && (
              <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted md:text-[13px]">{pick.trigger}</p>
            )}

            {pick.notes?.length > 0 && (
              <p className="truncate text-[11.5px] font-semibold text-clay">
                {pick.notes.slice(0, 3).join(" · ")}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-num text-[15px] font-bold">{formatIQD(pick.prices.g250)}</span>
              <button
                onClick={() => {
                  addToCart({
                    slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
                    name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
                  });
                  showToast(`أُضيف ${pick.name}`);
                }}
                aria-label={`أضف ${pick.name} للسلة`}
                className="flex h-9 items-center gap-1.5 bg-olive px-4 text-[12.5px] font-bold text-olive-text tap-fx transition-all hover:brightness-110 active:scale-95"
                style={{ borderRadius: 4 }}
              >
                أضف +
              </button>
              <Link
                href={`/product/?c=${pick.slug}`}
                className="text-[12.5px] font-bold text-accent"
              >
                التفاصيل ←
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
