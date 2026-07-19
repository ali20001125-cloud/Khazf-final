"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, HandCoins, Gift, Sparkles, ArrowLeft , ChevronDown } from "lucide-react";
import { formatIQD, governorates } from "@/lib/data";
import { useStore, useSiteConfig, boxPreview } from "@/lib/store";
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
  const { cart, clearCart, coupon, useCashback, boxGiftChoice, showToast } = useStore();

  const [form, setForm] = useState({ name: "", phone: "", email: "", governorate: "", address: "", note: "" });
  const [extrasOpen, setExtrasOpen] = useState(false);

  /* الزبون المعروف: بياناته تتعبأ لحالها */
  useEffect(() => {
    fetch("/api/customer/me/").then((r) => r.json()).then((me) => {
      if (me?.guest) return;
      setForm((f) => ({
        ...f,
        name: f.name || me.name || "",
        phone: f.phone || me.phone || "",
        governorate: f.governorate || me.governorate || "",
        address: f.address || me.address || "",
      }));
    }).catch(() => {});
  }, []);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Success | null>(null);

  const subtotal = useMemo(() => cart.reduce((t, i) => t + i.priceShown * i.qty, 0), [cart]);
  const box = useMemo(() => boxPreview(cart, config.boxTiers), [cart, config.boxTiers]);
  const freeDelivery = box.freeDelivery || coupon?.type === "FREE_DELIVERY";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSending(true);
    const note = form.note.trim();
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim() || "زبون خزف",
          phone: form.phone.trim(),
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
    } catch {
      showToast("انقطع الاتصال — حاول ثانية");
    }
    setSending(false);
  };

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
          {done.pointsEarned > 0 && (
            <div className="flex items-center gap-2 rounded-[12px] bg-gold/10 px-4 py-3 text-[13px] font-bold text-gold">
              <Sparkles size={15} /> ربحت <span className="font-num">{done.pointsEarned}</span> نقطة — تُفعَّل بعد التوصيل بـ٤٨ ساعة
            </div>
          )}
          {done.nextRewardMessage && (
            <div className="flex items-center gap-2 rounded-[12px] bg-olive/10 px-4 py-3 text-[13px] font-bold">
              <Gift size={15} className="text-accent" /> {done.nextRewardMessage}
            </div>
          )}
        </div>
        <p className="reveal mt-5 text-[13px] leading-relaxed text-muted">
          راح نتصل بيك لتأكيد الطلب، والتوصيل خلال ١–٢ يوم عمل.
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
              {extrasOpen && (<>
              <input placeholder="الاسم الكامل (اختياري)" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
              <input required type="tel" inputMode="tel" dir="ltr" placeholder="07XX XXX XXXX" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                className={`${inputCls} text-end font-num`} maxLength={11} />
              <div className="relative">
              <select required value={form.governorate}
                onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                className={`${inputCls} appearance-none ${form.governorate ? "" : "text-muted"}`}>
                <option value="" disabled>اختر محافظتك</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
              </div>
              <input type="email" dir="ltr" placeholder="الإيميل (اختياري)" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputCls} text-end`} />
              <input required placeholder="العنوان: المنطقة، أقرب نقطة دالة" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`${inputCls} sm:col-span-2`} />
              <textarea rows={2} placeholder="ملاحظات للطلب" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={`${inputCls} sm:col-span-2`} />
              </>)}
              <button type="button" onClick={() => setExtrasOpen((v) => !v)}
                className="flex items-center justify-between rounded-[14px] border border-dashed border-line px-4 py-3.5 text-[13px] font-semibold text-muted sm:col-span-2">
                بيانات إضافية — الاسم، الإيميل، ملاحظات (اختياري)
                <ChevronDown size={15} className={`transition-transform ${extrasOpen ? "rotate-180" : ""}`} />
              </button>
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
            {box.discount > 0 && (
              <div className="flex justify-between text-ok"><span>خصم البوكس</span><span className="font-num">−{formatIQD(box.discount)}</span></div>
            )}
            {coupon && <div className="flex justify-between text-ok"><span>كود {coupon.code}</span><span>مفعّل</span></div>}
            <div className="flex justify-between">
              <span className="text-muted">التوصيل</span>
              {freeDelivery ? <span className="font-semibold text-ok">مجاني</span> : <span className="font-num font-semibold">{formatIQD(config.deliveryPrice)}</span>}
            </div>
          </div>
          <p className="rounded-[12px] bg-bg-alt px-4 py-3 text-[11.5px] leading-relaxed text-muted">
            الإجمالي النهائي يُحسب ويُثبَّت الآن عند الضغط — يشمل مكافآت رحلتك ورصيدك تلقائياً.
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
