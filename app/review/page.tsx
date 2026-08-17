"use client";

import { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";
import { Star, Check, Coffee, Truck, User, Sparkles } from "lucide-react";

type Product = { productId: number; name: string; slug: string; image: string | null };
type OrderInfo = { orderNumber: string; name: string; status: string };

function StarRow({ value, onChange, size = 30 }: { value: number; onChange: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} نجوم`}
          className="transition-transform active:scale-90"
        >
          <Star
            size={size}
            className={(hover || value) >= n ? "fill-[#C9A15A] text-[#C9A15A]" : "text-[#E4DDD0]"}
            style={{ transition: "color .15s" }}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewPageInner() {
  const token = useSearchParams().get("token");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  // الحالة
  const [productRatings, setProductRatings] = useState<Record<number, { rating: number; comment: string }>>({});
  const [exp, setExp] = useState({ delivery: 0, courier: 0, ease: 0, comment: "" });
  const [showName, setShowName] = useState(false);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setErr("رابط غير صالح"); setLoading(false); return; }
    fetch(`/api/review/?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else {
          setOrder(d.order);
          setProducts(d.products);
          setAlready(d.alreadyReviewed);
          setName(d.order?.name ?? "");
        }
      })
      .catch(() => setErr("تعذّر تحميل الطلب"))
      .finally(() => setLoading(false));
  }, [token]);

  const setPR = (id: number, patch: Partial<{ rating: number; comment: string }>) =>
    setProductRatings((prev) => ({ ...prev, [id]: { rating: prev[id]?.rating ?? 0, comment: prev[id]?.comment ?? "", ...patch } }));

  const canSubmit = products.some((p) => (productRatings[p.productId]?.rating ?? 0) > 0) || exp.delivery > 0 || exp.ease > 0;

  const submit = async () => {
    setSending(true);
    try {
      const payload = {
        token,
        showName,
        name,
        products: products
          .filter((p) => (productRatings[p.productId]?.rating ?? 0) > 0)
          .map((p) => ({ productId: p.productId, rating: productRatings[p.productId].rating, comment: productRatings[p.productId].comment })),
        experience: exp,
      };
      const r = await fetch("/api/review/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "تعذّر الإرسال");
      else setDone(true);
    } catch { setErr("تعذّر الاتصال"); }
    setSending(false);
  };

  // ── الحالات ──
  if (loading)
    return <Shell><p className="py-20 text-center text-[#8A7F70]">جارٍ التحميل…</p></Shell>;

  if (err)
    return (
      <Shell>
        <div className="py-16 text-center">
          <p className="text-lg font-bold">{err}</p>
          <p className="mt-2 text-sm text-[#8A7F70]">تأكد من فتح الرابط الصحيح من فاتورتك أو بريدك.</p>
        </div>
      </Shell>
    );

  if (done || already)
    return (
      <Shell>
        <div className="py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#3D4230] text-[#F4F1EA]">
            <Check size={30} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">{already ? "سبق أن قيّمت هذا الطلب" : "وصل تقييمك"}</h1>
          <p className="mt-2 text-[15px] text-[#6E655A]">شكراً لوقتك — رأيك يصنع فرقاً حقيقياً لخزف 🤎</p>
          <a href="/" className="mt-7 inline-block rounded-full bg-[#A66A4C] px-7 py-3 text-sm font-bold text-white">العودة للمتجر</a>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="text-center">
        <p className="font-num text-[10px] tracking-[0.4em] text-[#BEA897]">YOUR EXPERIENCE</p>
        <h1 className="mt-2 text-[26px] font-bold">كيف كانت تجربتك؟</h1>
        <p className="mt-1.5 text-[13px] text-[#8A7F70]">
          طلبك <span className="font-num">{order?.orderNumber}</span> — قيّم ما تحب، والباقي اختياري
        </p>
      </div>

      {/* تقييم المنتجات */}
      {products.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#A66A4C]">
            <Coffee size={16} /> محاصيلك
          </div>
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.productId} className="rounded-[18px] border border-[#E4DDD0] bg-[#FBF9F4] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-white">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                    ) : <Coffee size={22} className="text-[#BEA897]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{p.name}</p>
                    <div className="mt-1.5">
                      <StarRow value={productRatings[p.productId]?.rating ?? 0} onChange={(n) => setPR(p.productId, { rating: n })} size={24} />
                    </div>
                  </div>
                </div>
                {(productRatings[p.productId]?.rating ?? 0) > 0 && (
                  <input
                    value={productRatings[p.productId]?.comment ?? ""}
                    onChange={(e) => setPR(p.productId, { comment: e.target.value })}
                    placeholder="كلمة عن طعمها؟ (اختياري)"
                    className="mt-3 w-full rounded-[12px] border border-[#E4DDD0] bg-white px-4 py-2.5 text-[13px] outline-none focus:border-[#A66A4C]"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* التوصيل والمندوب */}
      <section className="mt-7">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[#A66A4C]">
          <Truck size={16} /> التوصيل
        </div>
        <div className="space-y-3">
          <RatingCard icon={<Truck size={18} />} label="سرعة التوصيل" value={exp.delivery} onChange={(n) => setExp({ ...exp, delivery: n })} />
          <RatingCard icon={<User size={18} />} label="تعامل المندوب" value={exp.courier} onChange={(n) => setExp({ ...exp, courier: n })} />
          <RatingCard icon={<Sparkles size={18} />} label="سهولة الشراء من الموقع" value={exp.ease} onChange={(n) => setExp({ ...exp, ease: n })} />
        </div>
      </section>

      {/* رأي عام */}
      <section className="mt-7">
        <textarea
          value={exp.comment}
          onChange={(e) => setExp({ ...exp, comment: e.target.value })}
          placeholder="أي ملاحظة تساعدنا نتحسّن؟ (اختياري)"
          rows={3}
          className="w-full rounded-[16px] border border-[#E4DDD0] bg-[#FBF9F4] px-4 py-3 text-[14px] outline-none focus:border-[#A66A4C]"
        />
      </section>

      {/* الاسم اختياري */}
      <label className="mt-4 flex items-center gap-2.5 text-[13px]">
        <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="h-4 w-4 accent-[#A66A4C]" />
        أظهِر اسمي مع تقييماتي المنشورة
      </label>
      {showName && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسمك كما يظهر"
          className="mt-2 w-full rounded-[12px] border border-[#E4DDD0] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#A66A4C]"
        />
      )}

      <button
        onClick={submit}
        disabled={sending || !canSubmit}
        className="mt-6 w-full rounded-[14px] bg-[#3D4230] py-4 text-[15px] font-bold text-[#F4F1EA] transition-transform active:scale-[.99] disabled:opacity-40"
      >
        {sending ? "جارٍ الإرسال…" : "أرسل تقييمي"}
      </button>
      <p className="mt-3 text-center text-[11px] text-[#8A7F70]">تقييماتك تُنشر بعد مراجعة سريعة · شكراً لصدقك</p>
    </Shell>
  );
}

function RatingCard({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border border-[#E4DDD0] bg-[#FBF9F4] px-4 py-3.5">
      <span className="flex items-center gap-2.5 text-[14px] font-semibold">
        <span className="text-[#A66A4C]">{icon}</span> {label}
      </span>
      <StarRow value={value} onChange={onChange} size={22} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1C1A18]" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      <div className="mx-auto max-w-md px-5 py-10">{children}</div>
    </div>
  );
}


export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-[60svh]" />}>
      <ReviewPageInner />
    </Suspense>
  );
}
