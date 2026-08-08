"use client";
/** صفحة الهبوط — بلا قائمة ولا فوتر ولا روابط خارجة. الهدف واحد: الشراء. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Truck, Flame, Award, ShieldCheck, Star } from "lucide-react";
import { formatIQD, type Coffee } from "@/lib/data";
import { useStore } from "@/lib/store";
import { fbTrack } from "@/lib/fbpixel";
import { fmtDate } from "@/lib/datetime";

export default function LandingClient({ coffee }: { coffee: Coffee }) {
  const router = useRouter();
  const { addToCart } = useStore();
  const [weight, setWeight] = useState<"g250" | "g500" | "g1000">("g250");
  const [grind, setGrind] = useState("حبوب كاملة");

  const price =
    weight === "g500" ? coffee.prices.g500
    : weight === "g1000" ? coffee.prices.g1000
    : coffee.prices.g250;
  const label = weight === "g500" ? "٥٠٠غ" : weight === "g1000" ? "كيلو" : "٢٥٠غ";

  const weights = ([
    ["g250", "٢٥٠غ", coffee.prices.g250],
    ["g500", "٥٠٠غ", coffee.prices.g500],
    ["g1000", "كيلو", coffee.prices.g1000],
  ] as const).filter(([, , p]) => (p ?? 0) > 0);

  const grinds = ["حبوب كاملة", "V60 / فلتر", "إسبريسو", "فرنش برس"];

  const buy = () => {
    if (price == null || coffee.soldOut) return;
    addToCart({
      slug: coffee.slug,
      variant: weight.toUpperCase() as "G250" | "G500" | "G1000",
      grind,
      name: coffee.name,
      meta: `${label} · ${grind}`,
      priceShown: price,
    }, 1, true);
    fbTrack("InitiateCheckout", {
      content_ids: [coffee.slug], content_type: "product",
      value: price, currency: "IQD", num_items: 1,
    });
    router.push("/checkout/");
  };

  const roastFresh = (() => {
    if (!coffee.roastedOn) return null;
    const days = Math.floor((Date.now() - new Date(coffee.roastedOn).getTime()) / 864e5);
    return days >= 0 && days <= 30 ? fmtDate(coffee.roastedOn) : null;
  })();

  const CTA = ({ id }: { id: string }) => (
    <div id={id} className="mt-6">
      <button onClick={buy} disabled={coffee.soldOut || price == null}
        className="btn btn-clay flex w-full items-center justify-center !py-4 text-[16px] active:scale-[0.98] disabled:opacity-50">
        {coffee.soldOut ? "نفد مؤقتاً" : `اطلبه الآن — ${formatIQD(price ?? 0)}`}
      </button>
      <p className="mt-2.5 text-center text-[12px] text-muted">
        دفع عند الاستلام · توصيل ١–٢ يوم
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-10">
      {/* الهوية — بلا قائمة */}
      <p className="text-center font-num text-[10px] tracking-[0.4em] text-muted">KHAZF · خزف</p>

      {/* الصورة */}
      <div className="mt-6 overflow-hidden rounded-[24px] border border-line bg-white">
        {coffee.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coffee.image} alt={coffee.name} className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square items-center justify-center bg-bg-alt text-[13px] text-muted">
            {coffee.name}
          </div>
        )}
      </div>

      {/* الجملة الواحدة */}
      <h1 className="mt-7 text-[27px] font-bold leading-tight">
        {coffee.name}
        <span className="block text-[15px] font-medium text-muted">{coffee.country}</span>
      </h1>

      {coffee.notes?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {coffee.notes.map((n) => (
            <span key={n} className="rounded-full bg-bg-alt px-3 py-1 text-[12.5px] font-bold"
              style={{ color: coffee.accent }}>{n}</span>
          ))}
        </div>
      )}

      <p className="mt-4 text-[14.5px] leading-relaxed">
        {coffee.trigger || `قهوة مختصة من ${coffee.country}، محمّصة بدفعات صغيرة وتصل بابك خلال يوم إلى يومين.`}
      </p>

      {/* ثلاث نقاط فقط */}
      <div className="mt-6 space-y-2.5">
        {[
          { Icon: Flame, t: roastFresh ? `تحميص حديث · ${roastFresh}` : "تحميص حديث بدفعات صغيرة" },
          { Icon: Award, t: coffee.roast ? `تحميص ${coffee.roast}${coffee.process ? ` · معالجة ${coffee.process}` : ""}` : "محصول محدّد المصدر" },
          { Icon: Truck, t: "توصيل لكل العراق · الدفع عند الاستلام" },
        ].map(({ Icon, t }) => (
          <div key={t} className="flex items-center gap-2.5">
            <Icon size={17} className="shrink-0 text-clay" />
            <p className="text-[13.5px]">{t}</p>
          </div>
        ))}
      </div>

      {/* الاختيار */}
      <div className="mt-7">
        <p className="mb-2 text-[12px] font-bold text-muted">الوزن</p>
        <div className="flex gap-2">
          {weights.map(([k, l, p]) => (
            <button key={k} onClick={() => setWeight(k)}
              className={`flex-1 rounded-[13px] border px-3 py-2.5 transition-all active:scale-[0.97] ${
                weight === k ? "border-clay bg-clay/8" : "border-line bg-card"
              }`}>
              <span className="block text-[13px] font-bold">{l}</span>
              <span className="font-num mt-0.5 block text-[11.5px] text-muted">{formatIQD(p!)}</span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-5 text-[12px] font-bold text-muted">الطحن</p>
        <div className="flex flex-wrap gap-2">
          {grinds.map((g) => (
            <button key={g} onClick={() => setGrind(g)}
              className={`rounded-full border px-4 py-2 text-[12.5px] font-bold transition-all active:scale-[0.97] ${
                grind === g ? "border-clay bg-clay/8" : "border-line bg-card"
              }`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <CTA id="cta-1" />

      {/* الاعتراضات الثلاثة */}
      <div className="mt-12 space-y-3">
        <h2 className="text-[18px] font-bold">أسئلة قبل أن تطلب</h2>
        {[
          { q: "ما الذي يضمن جودتها؟", a: "محاصيل محدّدة المصدر، محمّصة بدفعات صغيرة متكرّرة، ومعبّأة بأكياس بصمّام أحادي يحفظ النكهة." },
          { q: "متى تصلني؟", a: "خلال يوم إلى يومين لكل محافظات العراق، وتدفع عند الاستلام — لا شيء مقدّماً." },
          { q: "وإن لم تعجبني؟", a: "افحص طلبك أمام المندوب قبل الدفع. وأي خلل في التغليف أو النقل نعوّضك عنه فوراً." },
        ].map((f) => (
          <div key={f.q} className="rounded-[16px] border border-line bg-card p-4">
            <p className="flex items-start gap-2 text-[14px] font-bold">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-olive" />
              {f.q}
            </p>
            <p className="mt-1.5 ps-6 text-[13px] leading-relaxed text-muted">{f.a}</p>
          </div>
        ))}
      </div>

      {/* تقييم إن وُجد */}
      {coffee.reviewsCount > 0 && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-[16px] border border-line bg-card px-4 py-3.5">
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={14}
                className={i < Math.round(coffee.rating) ? "fill-gold text-gold" : "text-line"} />
            ))}
          </div>
          <span className="font-num text-[13px] font-bold">{coffee.rating}</span>
          <span className="font-num text-[12px] text-muted">({coffee.reviewsCount} مراجعة)</span>
        </div>
      )}

      <CTA id="cta-2" />

      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-muted">
        <Check size={13} className="text-ok" /> خزف · قهوة مختصة · khazf.shop
      </p>
    </div>
  );
}
