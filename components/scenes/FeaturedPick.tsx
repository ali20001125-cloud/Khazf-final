"use client";
/**
 * محصولنا المختار — بقعة ضوء لمنتج واحد نريد دفعه للواجهة.
 * تتبع funnel البراند المكثّف: الاسم (الأضخم) → معلومات → trigger → نكهات → تقييم → شراء.
 * تجريبية على staging — تُنقل لـ main بعد الرضا.
 *
 * لتثبيت منتج بعينه: ضع slug القهوة في FEATURED_SLUG.
 * فارغ = يختار تلقائياً الأقل تقييماً (أقرب تقدير للأقل مبيعاً) لدفعه للواجهة.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";
import ProductJsonLd from "@/components/ProductJsonLd";

const FEATURED_SLUG: string = "";

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

  const specs = [pick.country, pick.process, pick.altitude]
    .filter(Boolean).join(" · ").toUpperCase();

  return (
    <section className="border-b border-line bg-ink text-bg" aria-labelledby="featured-pick-name">
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
      <div className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
        <span className="font-num block text-[10px] font-bold tracking-[0.28em] text-gold">
          OUR PICK
        </span>
        <p className="mt-2 text-[12.5px] font-bold text-bg/70">محصولنا المختار لك</p>

        <div className="mt-7 grid gap-px overflow-hidden bg-white/10 md:grid-cols-2" style={{ borderRadius: 4 }}>
          {/* الصورة */}
          <Link
            href={`/product/?c=${pick.slug}`}
            className="group relative block aspect-square overflow-hidden bg-black/20"
            aria-label={pick.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pick.image!}
              alt={`${pick.name} — ${(pick.notes ?? []).slice(0, 3).join("، ")}`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
            />
          </Link>

          {/* المعلومات */}
          <div className="flex flex-col justify-center gap-4 bg-ink px-5 py-8 md:px-8 md:py-9">
            {specs && (
              <p className="text-[10px] font-semibold tracking-[0.15em] text-bg/55">{specs}</p>
            )}
            <h2 id="featured-pick-name" className="font-[Amiri,serif] text-[34px] font-bold leading-[1.08] md:text-[46px]">
              {pick.name}
            </h2>

            {pick.trigger && (
              <p className="max-w-sm text-[14.5px] leading-[1.9] text-bg/85">{pick.trigger}</p>
            )}

            {pick.notes?.length > 0 && (
              <p className="text-[12.5px] font-semibold" style={{ color: "#dcb488" }}>
                {pick.notes.slice(0, 4).join(" · ")}
              </p>
            )}

            {pick.reviewsCount > 0 && (
              <p className="flex items-center gap-2 text-[12px] text-bg/70">
                <span className="font-num font-bold text-bg">{pick.rating.toFixed(1)}</span>
                <span className="text-gold">★★★★★</span>
                <span>من {pick.reviewsCount} تقييم</span>
              </p>
            )}

            <div className="mt-2 flex items-stretch gap-px bg-white/10" style={{ borderRadius: 4 }}>
              <button
                onClick={() => {
                  addToCart({
                    slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
                    name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
                  });
                  showToast(`أُضيف ${pick.name}`);
                }}
                aria-label={`أضف ${pick.name} للسلة`}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 bg-gold px-5 text-[14px] font-bold text-ink tap-fx transition-all hover:brightness-105 active:scale-[0.99]"
                style={{ borderRadius: 4 }}
              >
                أضف — {formatIQD(pick.prices.g250)}
              </button>
              <Link
                href={`/product/?c=${pick.slug}`}
                className="flex min-h-[52px] items-center justify-center border border-white/25 px-5 text-[13.5px] font-bold text-bg transition-colors hover:bg-white/5"
                style={{ borderRadius: 4 }}
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
