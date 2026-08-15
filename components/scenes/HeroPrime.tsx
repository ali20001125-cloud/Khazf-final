"use client";
/**
 * البطل — نسخة تحويل (Phase 1).
 * الهدف: يضرب بالعين بأقل من ثانية — صورة قهوة قوية + وعد واضح + عرض + منتج مميّز بسعره وطلب فوري.
 * يمسك زائر الإعلان البارد قبل ما يطلع. تجريبي على staging.
 */
import Link from "next/link";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig, useStore } from "@/lib/store";
import { formatIQD } from "@/lib/data";

const FEATURED_SLUG = "dorado";
const DARK = "#1c1a18";
const CREAM = "#f5f1e8";

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
    <section style={{ background: DARK, color: CREAM }} className="overflow-hidden">
      <div className="mx-auto grid max-w-4xl items-center gap-6 px-5 py-8 md:grid-cols-2 md:gap-8 md:px-8 md:py-12">
        {/* النص — يظهر ثانياً بالموبايل حتى الصورة تضرب أول */}
        <div className="order-2 md:order-1">
          <span className="font-num block text-[10px] font-bold tracking-[0.28em]" style={{ color: "var(--gold)" }}>
            KHAZF · IRAQ
          </span>
          <h1 className="mt-3 font-[Amiri,serif] text-[32px] font-bold leading-[1.18] md:text-[46px]">
            قهوة مختصّة،<br />تُحمَّص بطلبك
          </h1>
          <p className="mt-3 max-w-sm text-[13px] leading-[1.9] md:text-[14.5px]" style={{ color: "rgba(245,241,232,0.72)" }}>
            محاصيل مختارة توصلك طازجة خلال يوم إلى يومين — والدفع عند الاستلام.
          </p>

          {/* العروض — تطمين فوري يقلّل التردّد */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {offers.map((o) => (
              <span key={o} className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{ background: "rgba(245,241,232,0.10)", color: CREAM }}>
                {o}
              </span>
            ))}
          </div>

          {/* الأزرار */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {pick && (
              <Link href={`/product/?c=${pick.slug}`}
                className="flex min-h-[50px] items-center justify-center px-7 text-[14.5px] font-bold text-olive-text tap-fx transition-all hover:brightness-110 active:scale-[0.99]"
                style={{ background: "var(--accent)", borderRadius: 5 }}>
                اطلب {pick.name}
              </Link>
            )}
            <Link href="/products/?cat=coffee"
              className="flex min-h-[50px] items-center justify-center px-7 text-[14.5px] font-bold transition-colors active:scale-[0.99]"
              style={{ border: `1px solid rgba(245,241,232,0.35)`, color: CREAM, borderRadius: 5 }}>
              تصفّح كل المحاصيل
            </Link>
          </div>
        </div>

        {/* الصورة — بطاقة منتج مميّز، تضرب بالعين */}
        {pick && (
          <div className="order-1 md:order-2">
            <Link href={`/product/?c=${pick.slug}`} className="group relative block overflow-hidden shadow-2xl"
              style={{ borderRadius: 12 }} aria-label={pick.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pick.image!} alt={`${pick.name} — ${(pick.notes ?? []).slice(0, 3).join("، ")}`}
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] md:aspect-square" />
              {/* تدرّج سفلي حتى يبيّن النص */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
                style={{ background: "linear-gradient(to top, rgba(20,18,16,0.92), transparent)" }} />
              {/* شارة الاختيار */}
              <span className="absolute right-3 top-3 rounded-full px-3 py-1 text-[10.5px] font-bold text-olive-text"
                style={{ background: "var(--accent)" }}>
                اختيار خزف لك
              </span>
              {/* الاسم + السعر + التقييم */}
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-5" style={{ color: CREAM }}>
                <p className="font-[Amiri,serif] text-[26px] font-bold leading-tight md:text-[30px]">{pick.name}</p>
                {pick.notes?.length > 0 && (
                  <p className="mt-1 text-[12px] font-semibold" style={{ color: "var(--gold)" }}>
                    {pick.notes.slice(0, 3).join(" · ")}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-num text-[19px] font-bold">{formatIQD(pick.prices.g250)}</span>
                  {pick.reviewsCount > 0 && (
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: "rgba(245,241,232,0.85)" }}>
                      <span style={{ color: "var(--gold)" }}>★</span>
                      <span className="font-num font-bold">{pick.rating.toFixed(1)}</span>
                      <span>· {pick.reviewsCount}</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
            {/* طلب فوري بلا فتح الصفحة */}
            <button
              onClick={() => {
                addToCart({
                  slug: pick.slug, variant: "G250", grind: "حبوب كاملة",
                  name: pick.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: pick.prices.g250,
                });
                showToast(`أُضيف ${pick.name} — جاهز بسلّتك`);
              }}
              className="mt-2.5 flex min-h-[46px] w-full items-center justify-center text-[13.5px] font-bold tap-fx transition-all hover:brightness-110 active:scale-[0.99]"
              style={{ background: "rgba(245,241,232,0.12)", color: CREAM, borderRadius: 6 }}>
              أضِفه لسلّتك مباشرة ←
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
