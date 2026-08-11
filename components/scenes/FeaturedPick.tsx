"use client";
/**
 * اختيار خزف لك — بطاقة لمنتج واحد ندفعه للواجهة (تحت الهيرو).
 * خفيفة وفاتحة، عنوان واضح بتباين عالٍ، جملة بيعية كاملة، ودليل ثقة — هدفها الطلب.
 * تجريبية على staging — تُنقل لـ main بعد الرضا.
 *
 * لتثبيت منتج بعينه: ضع slug القهوة في FEATURED_SLUG (فارغ = الأقل تقييماً).
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
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
        {/* العنوان — واضح، بتباين عالٍ، بلا مباعدة حروف */}
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 shrink-0 bg-accent" style={{ borderRadius: 2 }} />
          <h2 className="text-[17px] font-extrabold text-ink md:text-[19px]">اختيار خزف لك</h2>
        </div>
        <p className="mt-1.5 ps-4 text-[12.5px] text-muted">محصول ننصح به بثقة — جرّبه وقرّر بنفسك.</p>

        <div className="mt-5 flex items-stretch gap-4 border border-line bg-bg p-3.5 shadow-sm md:gap-6 md:p-5" style={{ borderRadius: 8 }}>
          {/* الصورة */}
          <Link
            href={`/product/?c=${pick.slug}`}
            className="group relative block h-28 w-28 shrink-0 overflow-hidden bg-bg-alt md:h-40 md:w-40"
            style={{ borderRadius: 6 }}
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
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            {specs && (
              <p className="text-[9.5px] font-bold tracking-[0.14em] text-muted">{specs}</p>
            )}
            <h3 id="featured-pick-name" className="font-[Amiri,serif] text-[26px] font-bold leading-tight text-ink md:text-[32px]">
              {pick.name}
            </h3>

            {pick.trigger && (
              <p className="text-[13.5px] font-medium leading-[1.85] text-ink/80 md:text-[14.5px]">{pick.trigger}</p>
            )}

            {pick.notes?.length > 0 && (
              <p className="text-[12.5px] font-bold text-clay">
                {pick.notes.slice(0, 4).join(" · ")}
              </p>
            )}

            {pick.reviewsCount > 0 && (
              <p className="flex items-center gap-2 text-[12px] text-muted">
                <span className="text-gold">★★★★★</span>
                <span className="font-num font-bold text-ink">{pick.rating.toFixed(1)}</span>
                <span>· {pick.reviewsCount} تقييم</span>
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className="font-num text-[17px] font-bold text-ink">{formatIQD(pick.prices.g250)}</span>
              <button
                onClick={() => {
                  addToCart({
                    slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
                    name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
                  });
                  showToast(`أُضيف ${pick.name} — جاهز بسلّتك`);
                }}
                aria-label={`أضف ${pick.name} للسلة`}
                className="flex h-11 items-center gap-1.5 bg-olive px-6 text-[13.5px] font-bold text-olive-text tap-fx transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ borderRadius: 5 }}
              >
                أضِفه لسلّتك
              </button>
              <Link href={`/product/?c=${pick.slug}`} className="text-[12.5px] font-bold text-accent">
                التفاصيل ←
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
