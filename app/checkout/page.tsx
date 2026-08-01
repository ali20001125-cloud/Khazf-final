"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, HandCoins, Gift, Sparkles, ArrowLeft , ChevronDown } from "lucide-react";
import { formatIQD, governorates } from "@/lib/data";
import { normalizeIqPhone } from "@/lib/phone";
import { useStore, useSiteConfig, boxPreview } from "@/lib/store";
import { fbTrack } from "@/lib/fbpixel";
import { useMotion } from "@/lib/motion";

const inputCls =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent";

type Success = {
  orderNumber: string;
  total: number;
  pointsEarned: number;
  nextRewardMessage: string | null;
};

export default function CheckoutPage() {
  const scope = useMotion();
  const config = useSiteConfig();
  const { cart, clearCart, coupon, useCashback, setUseCashback, boxGiftChoice, showToast } = useStore();

  const [form, setForm] = useState({ name: "", phone: "", email: "", governorate: "", address: "", note: "" });

  /* حدث بدء الدفع (مرة واحدة عند فتح الصفحة مع سلة غير فارغة) */
  useEffect(() => {
    if (cart.length === 0) return;
    fbTrack("InitiateCheckout", {
      content_ids: cart.map((i) => i.slug),
      content_type: "product",
      num_items: cart.reduce((t, i) => t + i.qty, 0),
      value: cart.reduce((t, i) => t + i.priceShown * i.qty, 0),
      currency: "IQD",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* الزبون المعروف: بياناته تتعبأ لحالها */
  useEffect(() => {
    fetch("/api/customer/me/").then((r) => r.json()).then((me) => {
      if (me?.guest) return;
      setForm((f) => ({
        ...f,
        name: f.name || me.name || "",
        phone: f.phone || me.phone || "",
        email: f.email || me.email || "",
        governorate: f.governorate || me.governorate || "",
        address: f.address || me.address || "",
      }));
    }).catch(() => {});
  }, []);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Success | null>(null);

  // ── المعاينة الحية من الخادم (نفس حساب الطلب: خصم + كاش باك + تقريب) ──
  type Preview = {
    itemsSubtotal: number; boxDiscount: number; journeyDiscount: number; journeyPct: number;
    pointsAvailable: number; pointsUsedDinars: number; pointsRemaining: number;
    deliveryCharged: number; freeDelivery: boolean; total: number; giftName: string | null;
  };
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (cart.length === 0) { setPreview(null); return; }
    const ctrl = new AbortController();
    setPreviewing(true);
    const body = {
      items: cart.map((i) => ({ slug: i.slug, variant: i.variant, qty: i.qty, boxGroup: i.boxGroup ?? null })),
      phone: normalizeIqPhone(form.phone) ?? "",
      governorate: form.governorate,
      couponCode: coupon?.code ?? null,
      usePoints: useCashback,
    };
    fetch("/api/checkout/preview/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal })
      .then((r) => r.json()).then((d) => { if (!d.error) setPreview(d); }).catch(() => {}).finally(() => setPreviewing(false));
    return () => ctrl.abort();
  }, [cart, form.phone, form.governorate, coupon, useCashback]);

  // معرّف الجلسة (نفس متتبّع الزيارات)
  const sid = () => { try { let id = sessionStorage.getItem("khz_sid"); if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("khz_sid", id); } return id; } catch { return "anon"; } };

  const subtotal = useMemo(() => cart.reduce((t, i) => t + i.priceShown * i.qty, 0), [cart]);

  // حفظ لقطة السلة (لكشف الهجران)
  useEffect(() => {
    if (cart.length === 0 || done) return;
    const t = setTimeout(() => {
      fetch("/api/track/cart/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid(), phone: form.phone, name: form.name, email: form.email,
          items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.priceShown })),
          itemsTotal: subtotal,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [cart, form.phone, form.name, subtotal, done]);
  const box = useMemo(() => boxPreview(cart, config.boxTiers), [cart, config.boxTiers]);
  const freeDelivery = box.freeDelivery || coupon?.type === "FREE_DELIVERY";
  const deliveryFee = freeDelivery ? 0 : config.deliveryPrice;
  const estTotal = Math.ceil(Math.max(0, subtotal - box.discount + deliveryFee) / 250) * 250;

  const goTo = (id: string, msg: string) => {
    showToast(msg);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 400);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    // تحقق ودود بالترتيب
    if (!normalizeIqPhone(form.phone)) return goTo("f-phone", "اكتب رقم هاتفك الصحيح");
    if (!form.governorate) return goTo("f-gov", "اختر محافظتك");
    if (!form.address.trim()) return goTo("f-address", "اكتب عنوانك حتى يوصلك الطلب");
    setSending(true);
    const note = form.note.trim();
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || "زبون خزف",
          phone: normalizeIqPhone(form.phone) ?? form.phone.trim(),
          email: form.email.trim() || null,
          governorate: form.governorate,
          address: form.address.trim(),
          note: note || null,
          items: cart.map((i) => ({
            slug: i.slug, variant: i.variant, qty: i.qty, grind: i.grind, boxGroup: i.boxGroup ?? null,
          })),
          couponCode: coupon?.code ?? null,
          usePoints: useCashback,
          boxGiftChoice,
        }),
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.error ?? "تعذّر إتمام الطلب"); setSending(false); return; }
      setDone(d);
      clearCart();
      fetch("/api/track/cart/", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid() }) }).catch(() => {});
    } catch {
      showToast("انقطع الاتصال — حاول ثانية");
    }
    setSending(false);
  };

  /* حدث شراء لـ Pixel + GA عند نجاح الطلب */
  useEffect(() => {
    if (!done) return;
    try {
      // @ts-expect-error fbq عام
      if (window.fbq) window.fbq("track", "Purchase", { value: done.total, currency: "IQD" });
      // @ts-expect-error gtag عام
      if (window.gtag) window.gtag("event", "purchase", { value: done.total, currency: "IQD", transaction_id: done.orderNumber });
    } catch {}
  }, [done]);

  /* ─── النجاح: حقيقة الخادم ─── */
  if (done)
    return (
      <div ref={scope} className="mx-auto max-w-md px-5 pb-24 pt-36 text-center">
        <div className="reveal mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok text-olive-text">
          <Check size={28} strokeWidth={3} />
        </div>
        <h1 className="reveal mt-6 text-3xl font-bold">تم استلام طلبك</h1>
        <p className="reveal font-num mt-3 text-lg font-bold text-accent">{done.orderNumber}</p>
        <div className="reveal mt-6 space-y-3 rounded-[20px] border border-line bg-card p-6 text-start">
          <div className="flex justify-between text-[14px]">
            <span className="text-muted">الإجمالي (دفع عند الاستلام)</span>
            <span className="font-num text-lg font-bold">{formatIQD(done.total)}</span>
          </div>
          <a href={`/invoice/?n=${done.orderNumber}&p=${encodeURIComponent(form.phone)}`} target="_blank"
            className="flex items-center justify-center gap-2 rounded-[12px] bg-bg-alt px-4 py-3 text-[13px] font-bold">
            🧾 عرض / طباعة الفاتورة
          </a>
          {done.pointsEarned > 0 && (
            <div className="flex items-center gap-2 rounded-[12px] bg-gold/10 px-4 py-3 text-[13px] font-bold text-gold">
              <Sparkles size={15} /> ربحت <span className="font-num">{formatIQD(done.pointsEarned)}</span> كاش باك — يُفعَّل فور توصيل طلبك
            </div>
          )}
          {done.nextRewardMessage && (
            <div className="flex items-center gap-2 rounded-[12px] bg-olive/10 px-4 py-3 text-[13px] font-bold">
              <Gift size={15} className="text-accent" /> {done.nextRewardMessage}
            </div>
          )}
        </div>
        <p className="reveal mt-5 text-[13px] leading-relaxed text-muted">
          التوصيل خلال ١–٢ يوم عمل لكل المحافظات.
        </p>
        <div className="reveal mt-7 flex justify-center gap-3">
          <Link href="/track/" className="btn btn-olive !px-6 !py-3 text-sm">تتبع الطلب</Link>
          <Link href="/products/?cat=coffee" className="btn btn-ghost !px-6 !py-3 text-sm">رجوع للمتجر</Link>
        </div>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">سلتك فارغة</h1>
        <Link href="/products/?cat=coffee" className="btn btn-clay mt-6 !px-7 !py-3 text-sm">تسوّق القهوة</Link>
      </div>
    );

  return (
    <div ref={scope} className="mx-auto max-w-5xl px-4 pb-28 pt-28 md:px-8 md:pt-32">
      <h1 className="reveal text-3xl font-bold md:text-4xl">إتمام الطلب</h1>

      <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section className="reveal">
            <h2 className="mb-4 text-lg font-bold">بيانات التوصيل</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* ١) الهاتف — بمؤشر صحة فوري */}
              <div className="relative sm:col-span-2">
                <input id="f-phone" required type="tel" inputMode="tel" dir="ltr" placeholder="07XX XXX XXXX — رقم الهاتف" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                  className={`${inputCls} w-full text-end font-num ${normalizeIqPhone(form.phone) ? "!border-ok" : ""}`} maxLength={11} />
                {normalizeIqPhone(form.phone) && (
                  <span className="absolute inset-y-0 start-3 flex items-center gap-1 text-[11px] font-bold text-ok">
                    <Check size={14} strokeWidth={3} /> صحيح
                  </span>
                )}
              </div>

              {/* ٢) المحافظة — قائمة بارزة */}
              <div className="relative sm:col-span-2">
                <span className="pointer-events-none absolute -top-2 end-3 bg-bg px-2 text-[10.5px] font-bold text-accent">المحافظة *</span>
                <select id="f-gov" required value={form.governorate}
                  onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                  className={`w-full appearance-none rounded-[14px] border-2 bg-card px-4 py-3.5 text-[14px] font-bold outline-none transition-colors ${
                    form.governorate ? "border-line" : "border-accent/50 text-muted"
                  }`}>
                  <option value="" disabled>اضغط واختر محافظتك من القائمة ▾</option>
                  {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={18} strokeWidth={2.6} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-accent" />
              </div>

              {/* ٣) العنوان */}
              <input id="f-address" required placeholder="العنوان: المنطقة، أقرب نقطة دالة" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`${inputCls} sm:col-span-2`} />

              {/* ٤) الملاحظات */}
              <textarea rows={2} placeholder="ملاحظات للطلب (اختياري)" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={`${inputCls} sm:col-span-2`} />

              {/* ٥) الاسم والإيميل — ظاهران مباشرة (الإيميل مهم للفاتورة والتقييم) */}
              <input placeholder="الاسم الكامل" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              <input type="email" dir="ltr" placeholder="الإيميل" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} text-end`} />
            </div>
          </section>

          <section className="reveal">
            <h2 className="mb-4 text-lg font-bold">الدفع</h2>
            <div className="flex items-center gap-3 rounded-[16px] border-2 border-olive bg-card p-4">
              <HandCoins size={20} className="text-olive" />
              <div>
                <p className="text-sm font-bold">كاش عند الاستلام</p>
                <p className="text-[12px] text-muted">افحص طلبك بيدك قبل ما تدفع</p>
              </div>
              <Check size={18} className="ms-auto text-ok" />
            </div>
          </section>
        </div>

        {/* الملخص */}
        <aside className="h-fit space-y-3 rounded-[22px] border border-line bg-card p-6 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">طلبك</h2>
          <ul className="space-y-2 text-[13px]">
            {cart.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted">{i.name} ×{i.qty}</span>
                <span className="font-num shrink-0 font-semibold">{formatIQD(i.priceShown * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-line pt-3 text-[13px]">
            {/* منتجات */}
            <div className="flex justify-between">
              <span className="text-muted">المنتجات</span>
              <span className="font-num font-semibold">{formatIQD(preview?.itemsSubtotal ?? subtotal - box.discount)}</span>
            </div>
            {/* خصم الرحلة/الولاء التلقائي */}
            {(preview?.journeyDiscount ?? 0) > 0 && (
              <div className="flex justify-between text-ok">
                <span>خصم الولاء{preview!.journeyPct > 0 ? ` (${preview!.journeyPct}٪)` : ""}</span>
                <span className="font-num">−{formatIQD(preview!.journeyDiscount)}</span>
              </div>
            )}
            {coupon && <div className="flex justify-between text-ok"><span>كود {coupon.code}</span><span>مفعّل</span></div>}
            {/* الكاش باك المستخدم */}
            {(preview?.pointsUsedDinars ?? 0) > 0 && (
              <div className="flex justify-between text-accent">
                <span>الكاش باك المستخدم</span>
                <span className="font-num">−{formatIQD(preview!.pointsUsedDinars)}</span>
              </div>
            )}
            {/* التوصيل */}
            <div className="flex justify-between">
              <span className="text-muted">التوصيل</span>
              {(preview?.freeDelivery ?? freeDelivery) ? <span className="font-semibold text-ok">مجاني</span> : <span className="font-num font-semibold">{formatIQD(preview?.deliveryCharged ?? config.deliveryPrice)}</span>}
            </div>
            {/* الإجمالي */}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="text-[15px] font-bold">الإجمالي</span>
              <span className="font-num text-xl font-bold text-accent">
                {previewing && !preview ? "…" : formatIQD(preview?.total ?? estTotal)}
              </span>
            </div>
          </div>
          {/* الكاش باك — تفعيل/إلغاء من صفحة الدفع أيضاً */}
          {(preview?.pointsAvailable ?? 0) > 0 && (
            <div>
              <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-bg p-3.5">
                <input type="checkbox" checked={useCashback}
                  onChange={(e) => setUseCashback(e.target.checked)}
                  className="h-4 w-4 accent-[#c9a961]" />
                <span className="text-[13px] font-bold">
                  استخدم رصيدك — <span className="font-num">{formatIQD(preview!.pointsAvailable)}</span> كاش باك
                </span>
              </label>
              {useCashback && (preview?.pointsUsedDinars ?? 0) > 0 && (
                <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-accent">
                  استُخدم {formatIQD(preview!.pointsUsedDinars)} من رصيدك · يبقى {formatIQD(preview!.pointsRemaining)} في حسابك
                </p>
              )}
            </div>
          )}
          <p className="rounded-[12px] bg-bg-alt px-4 py-3 text-[11.5px] leading-relaxed text-muted">
            الدفع عند الاستلام · جميع الخصومات مطبّقة أعلاه.
          </p>
          <button type="submit" disabled={sending}
            className="btn btn-clay flex w-full items-center justify-center gap-2 !py-4 text-[15px] active:scale-[0.98] disabled:opacity-60">
            {sending ? "جارٍ التثبيت…" : <>ثبّت الطلب <ArrowLeft size={16} /></>}
          </button>
        </aside>
      </form>
    </div>
  );
}
