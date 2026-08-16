"use client";
/**
 * البطل — نسخة تحويل فاتحة (Phase 1) متناسقة مع باقي الرئيسية.
 * الهدف: يضرب بالعين بأقل من ثانية — صورة قهوة قوية + وعد واضح + عرض + منتج مميّز بسعره وطلب فوري.
 * تجريبي على staging.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig, useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";

const FEATURED_SLUG = "dorado";

export function HeroPrime() {
  const { coffees } = useCatalog();
  const { addToCart, showToast } = useStore();
  const config = useSiteConfig();

  const available = coffees.filter((c) => !c.soldOut && c.image);
  const pick =
    available.find((c) => c.slug.toLowerCase() === FEATURED_SLUG) ??
    [...available].sort((a, b) => b.reviewsCount - a.reviewsCount)[0];

  const offers = [
    "توصيل ١–٢ يوم",
    "الدفع عند الاستلام",
    config.freeDeliveryThreshold > 0
      ? `توصيل مجاني فوق ${formatIQD(config.freeDeliveryThreshold)}`
      : `${config.cashbackPct}٪ نقاط ولاء`,
  ];

  return (
    <section className="border-b border-line bg-bg">
      <div className="mx-auto grid max-w-4xl items-center gap-6 px-5 py-8 md:grid-cols-2 md:gap-9 md:px-8 md:py-12">
        {/* النص — يظهر ثانياً بالموبايل حتى الصورة تضرب أول */}
        <div className="order-2 md:order-1">
          <span className="font-num block text-[10px] font-bold tracking-[0.28em] text-accent">KHAZF · IRAQ</span>
          <h1 className="mt-3 font-[Amiri,serif] text-[33px] font-bold leading-[1.18] text-ink md:text-[46px]">
            قهوة مختصّة،<br />تُحمَّص بطلبك
          </h1>
          <p className="mt-3 max-w-sm text-[13px] leading-[1.9] text-muted md:text-[14.5px]">
            محاصيل مختارة توصلك طازجة خلال يوم إلى يومين — والدفع عند الاستلام.
          </p>

          {/* العروض — تطمين فوري يقلّل التردّد */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {offers.map((o) => (
              <span key={o} className="rounded-full border border-line bg-bg-alt px-3 py-1 text-[11px] font-semibold text-ink">
                {o}
              </span>
            ))}
          </div>

          {/* الأزرار */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {pick && (
              <Link href={`/product/?c=${pick.slug}`}
                className="flex min-h-[50px] items-center justify-center bg-olive px-7 text-[14.5px] font-bold text-olive-text tap-fx transition-all hover:brightness-110 active:scale-[0.99]"
                style={{ borderRadius: 5 }}>
                اطلب {pick.name}
              </Link>
            )}
            <Link href="/products/?cat=coffee"
              className="flex min-h-[50px] items-center justify-center border border-ink bg-bg px-7 text-[14.5px] font-bold text-ink transition-colors hover:bg-bg-alt active:scale-[0.99]"
              style={{ borderRadius: 5 }}>
              تصفّح كل المحاصيل
            </Link>
          </div>

          {pick && pick.reviewsCount > 0 && (
            <p className="mt-4 flex items-center gap-2 text-[12px] text-muted">
              <span className="text-gold">★★★★★</span>
              <span className="font-num font-bold text-ink">{pick.rating.toFixed(1)}</span>
              <span>· {pick.reviewsCount} تقييم</span>
            </p>
          )}
        </div>

        {/* الصورة — بطاقة المنتج المميّز، تضرب بالعين */}
        {pick && (
          <div className="order-1 md:order-2">
            <Link href={`/product/?c=${pick.slug}`} className="group relative block overflow-hidden border border-line bg-bg-alt shadow-sm"
              style={{ borderRadius: 10 }} aria-label={pick.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pick.image!} alt={`${pick.name} — ${(pick.notes ?? []).slice(0, 3).join("، ")}`}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] md:aspect-square" />
              <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[10.5px] font-bold text-olive-text">
                اختيار خزف لك
              </span>
            </Link>

            {/* اسم + إيحاءات + سعر + طلب فوري — بطاقة فاتحة متناسقة */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-[Amiri,serif] text-[24px] font-bold leading-tight text-ink md:text-[27px]">{pick.name}</p>
                {pick.notes?.length > 0 && (
                  <p className="mt-0.5 truncate text-[12px] font-bold text-accent">{pick.notes.slice(0, 3).join(" · ")}</p>
                )}
              </div>
              <span className="font-num shrink-0 text-[18px] font-bold text-ink">{formatIQD(pick.prices.g250)}</span>
            </div>
            <button
              onClick={() => {
                addToCart({
                  slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
                  name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
                });
                showToast(`أُضيف ${pick.name} — جاهز بسلّتك`);
              }}
              className="mt-2.5 flex min-h-[46px] w-full items-center justify-center border border-ink bg-bg text-[13.5px] font-bold text-ink tap-fx transition-colors hover:bg-bg-alt active:scale-[0.99]"
              style={{ borderRadius: 6 }}>
              أضِفه لسلّتك مباشرة ←
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
