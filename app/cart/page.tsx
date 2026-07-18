"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Ticket, Wallet, Gift, ArrowLeft } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useStore, useSiteConfig, boxPreview } from "@/lib/store";
import { useMotion } from "@/lib/motion";

type Me = { guest?: boolean; pointsBalance?: number; pointsValueDinars?: number; name?: string };

export default function CartPage() {
  const scope = useMotion();
  const config = useSiteConfig();
  const {
    cart, setQty, removeFromCart,
    coupon, setCoupon, useCashback, setUseCashback,
    boxGiftChoice, showToast,
  } = useStore();

  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [me, setMe] = useState<Me>({ guest: true });

  useEffect(() => {
    fetch("/api/customer/me").then((r) => r.json()).then(setMe).catch(() => {});
  }, []);

  const subtotal = useMemo(() => cart.reduce((t, i) => t + i.priceShown * i.qty, 0), [cart]);
  const box = useMemo(() => boxPreview(cart, config.boxTiers), [cart, config.boxTiers]);

  const afterBox = subtotal - box.discount;
  const couponDiscount =
    coupon?.type === "PERCENT" ? Math.round((afterBox * coupon.value) / 100)
    : coupon?.type === "FIXED" ? Math.min(coupon.value, afterBox)
    : 0;
  const pointsDinars = useCashback ? Math.min(me.pointsValueDinars ?? 0, afterBox - couponDiscount) : 0;
  const freeDelivery = box.freeDelivery || coupon?.type === "FREE_DELIVERY";
  const delivery = freeDelivery ? 0 : config.deliveryPrice;
  const previewTotal = Math.max(0, afterBox - couponDiscount - pointsDinars) + delivery;

  const tryCoupon = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const r = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.error ?? "الكود غير صالح"); setCoupon(null); }
      else { setCoupon(d); showToast(`كود «${d.code}» مفعّل`); setCode(""); }
    } catch { showToast("تعذّر الفحص — حاول ثانية"); }
    setChecking(false);
  };

  if (cart.length === 0)
    return (
      <div ref={scope} className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <p className="reveal text-5xl">🛍</p>
        <h1 className="reveal mt-5 text-2xl font-bold">سلتك فارغة</h1>
        <p className="reveal mt-2 text-sm text-muted">ابدأ من محاصيلنا — أو خلّي البوكس يوفّرلك</p>
        <div className="reveal mt-7 flex gap-3">
          <Link href="/products/?cat=coffee" className="btn btn-olive !px-6 !py-3 text-sm">تسوّق القهوة</Link>
          <Link href="/box/" className="btn btn-ghost !px-6 !py-3 text-sm">بناء البوكس</Link>
        </div>
      </div>
    );

  return (
    <div ref={scope} className="mx-auto max-w-5xl px-4 pb-28 pt-28 md:px-8 md:pt-32">
      <h1 className="reveal text-3xl font-bold md:text-4xl">السلة</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* الأسطر */}
        <div className="space-y-3">
          {cart.map((i) => (
            <div key={i.key} className="flex items-center gap-4 rounded-[18px] border border-line bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {i.name}
                  {i.boxGroup != null && (
                    <span className="ms-2 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-bold text-gold">بوكس</span>
                  )}
                </p>
                {i.meta && <p className="mt-0.5 text-[12px] text-muted">{i.meta}</p>}
                <p className="font-num mt-1 text-[13px] font-semibold">{formatIQD(i.priceShown)}</p>
              </div>
              <div className="flex items-center gap-2.5 rounded-full border border-line px-2 py-1.5">
                <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="أنقص" className="text-muted hover:text-ink"><Minus size={14} /></button>
                <span className="font-num w-5 text-center text-sm font-bold">{i.qty}</span>
                <button onClick={() => setQty(i.key, i.qty + 1)} aria-label="زد" className="text-muted hover:text-ink"><Plus size={14} /></button>
              </div>
              <button onClick={() => removeFromCart(i.key)} aria-label="احذف" className="text-muted transition-colors hover:text-accent"><Trash2 size={17} /></button>
            </div>
          ))}

          {box.bags > 0 && (
            <div className="rounded-[16px] bg-olive/8 border border-olive/20 px-5 py-3.5 text-[13px] font-semibold">
              بوكس <span className="font-num">{box.bags}</span> أكياس
              {box.pct > 0 && <> — خصم <span className="font-num">{box.pct}٪</span></>}
              {box.freeDelivery && " + توصيل مجاني"}
              {box.gift && (boxGiftChoice ? ` + هدية «${boxGiftChoice}»` : " + هدية تختارها")}
            </div>
          )}
        </div>

        {/* الملخص */}
        <aside className="h-fit space-y-4 rounded-[22px] border border-line bg-card p-6 lg:sticky lg:top-28">
          {/* كود الخصم */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Ticket size={14} /> كود الخصم</p>
            {coupon ? (
              <div className="flex items-center justify-between rounded-[12px] bg-ok/10 px-4 py-3 text-[13px] font-bold text-ok">
                <span className="font-num">{coupon.code}</span>
                <button onClick={() => setCoupon(null)} className="text-muted hover:text-accent">إزالة</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="كود الخصم"
                  className="font-num w-full rounded-[12px] border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
                />
                <button onClick={tryCoupon} disabled={checking} className="btn btn-ghost shrink-0 !px-4 !py-2.5 text-[13px] disabled:opacity-50">
                  {checking ? "…" : "تفعيل"}
                </button>
              </div>
            )}
          </div>

          {/* الرصيد */}
          {!me.guest && (me.pointsBalance ?? 0) > 0 && (
            <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-bg p-3.5">
              <input type="checkbox" checked={useCashback} onChange={(e) => setUseCashback(e.target.checked)} className="h-4 w-4 accent-[#c9a961]" />
              <Wallet size={16} className="text-gold" />
              <span className="text-[13px] font-bold">
                استخدم رصيدك — <span className="font-num">{me.pointsBalance}</span> نقطة (<span className="font-num">{formatIQD(me.pointsValueDinars ?? 0)}</span>)
              </span>
            </label>
          )}

          {/* الأرقام */}
          <div className="space-y-2 border-t border-line pt-4 text-[13.5px]">
            <div className="flex justify-between"><span className="text-muted">المجموع</span><span className="font-num font-semibold">{formatIQD(subtotal)}</span></div>
            {box.discount > 0 && (
              <div className="flex justify-between text-ok"><span>خصم البوكس ({box.pct}٪)</span><span className="font-num font-semibold">−{formatIQD(box.discount)}</span></div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-ok"><span>الكود</span><span className="font-num font-semibold">−{formatIQD(couponDiscount)}</span></div>
            )}
            {pointsDinars > 0 && (
              <div className="flex justify-between text-gold"><span>الرصيد</span><span className="font-num font-semibold">−{formatIQD(pointsDinars)}</span></div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">رسوم التوصيل</span>
              {freeDelivery ? <span className="font-semibold text-ok">مجاني</span> : <span className="font-num font-semibold">{formatIQD(delivery)}</span>}
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <span>الإجمالي التقريبي</span><span className="font-num">{formatIQD(previewTotal)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted">الإجمالي النهائي يُثبَّت عند إتمام الطلب (قد يشمل مكافأة رحلتك تلقائياً)</p>
          </div>

          <Link href="/checkout/" className="btn btn-clay flex w-full items-center justify-center gap-2 !py-4 text-[15px] active:scale-[0.98]">
            إتمام الطلب <ArrowLeft size={16} />
          </Link>
          <p className="text-center text-[11px] text-muted">دفع عند الاستلام · توصيل موحّد لكل المحافظات</p>
        </aside>
      </div>

      {box.gift && !boxGiftChoice && (
        <Link href="/box/" className="reveal mt-6 flex items-center justify-center gap-2 rounded-[16px] border border-gold/50 bg-gold/10 py-3.5 text-[13px] font-bold text-gold">
          <Gift size={15} /> وصلت لهدية البوكس — ارجع واختَرها
        </Link>
      )}
    </div>
  );
}
