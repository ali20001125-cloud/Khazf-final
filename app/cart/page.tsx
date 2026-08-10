"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMe } from "@/lib/me";
import Link from "next/link";
import { Minus, Plus, Trash2, Ticket, Wallet, Gift, ArrowLeft } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useStore, useSiteConfig, boxPreview } from "@/lib/store";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion } from "@/lib/motion";
import { gaViewCart } from "@/lib/ga";
import PaperCupsGift from "@/components/PaperCupsGift";

type Me = { guest?: boolean; pointsBalance?: number; pointsValueDinars?: number; name?: string; email?: string | null; phone?: string | null };

export default function CartPage() {
  const scope = useMotion();
  const gaSent = useRef(false);

  const config = useSiteConfig();
  const { coffees, tools } = useCatalog();

  const {
    cart, setQty, removeFromCart, addToCart, convertToBox,
    coupon, setCoupon, useCashback, setUseCashback,
    boxGiftChoice, showToast,
  } = useStore();

  /* حدث فتح السلة — مرة واحدة */
  useEffect(() => {
    if (gaSent.current || cart.length === 0) return;
    gaSent.current = true;
    gaViewCart(
      cart.map((i) => ({ item_id: i.slug, item_name: i.name, price: i.priceShown, quantity: i.qty })),
      cart.reduce((t, i) => t + i.priceShown * i.qty, 0)
    );
  }, [cart]);

  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [me, setMe] = useState<Me>({ guest: true });

  useEffect(() => {
    fetchMe().then((d) => setMe(d as Me)).catch(() => {});
  }, []);

  // التقاط السلة تلقائياً (للتذكير لاحقاً) — مع بيانات المسجّل إن وُجدت
  useEffect(() => {
    if (cart.length === 0) return;
    const sid = () => { try { let id = sessionStorage.getItem("khz_sid"); if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("khz_sid", id); } return id; } catch { return "anon"; } };
    const t = setTimeout(() => {
      fetch("/api/track/cart/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid(),
          phone: me.phone ?? null,
          name: me.name ?? null,
          email: me.email ?? null,
          items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.priceShown })),
          itemsTotal: cart.reduce((t, i) => t + i.priceShown * i.qty, 0),
        }),
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [cart, me]);

  const subtotal = useMemo(() => cart.reduce((t, i) => t + i.priceShown * i.qty, 0), [cart]);
  const box = useMemo(() => boxPreview(cart, config.boxTiers), [cart, config.boxTiers]);

  /* فرصة البوكس: أكياس قهوة عادية (٢٥٠غ) خارج البوكس — نحسب كم يوفّر لو حوّلها */
  const boxChance = useMemo(() => {
    const loose = cart.filter((i) => i.variant === "G250" && i.boxGroup == null);
    const bags = loose.reduce((t, i) => t + i.qty, 0);
    if (bags === 0) return null;
    const sub = loose.reduce((t, i) => t + i.priceShown * i.qty, 0);
    const tiers = config.boxTiers ?? [];
    // خصم لو حوّلناها الآن
    let pct = 0, free = false, gift = false;
    for (const t of tiers) if (bags >= t.bags) {
      if (t.rewardType === "PERCENT") pct = Math.max(pct, t.value ?? 0);
      if (t.rewardType === "FREE_DELIVERY") free = true;
      if (t.rewardType === "GIFT") gift = true;
    }
    // التوفير الفعلي بعد التقريب لأعلى ٢٥٠ — يطابق ما يدفعه الزبون
    const cap = config.boxDiscountCap ?? 20000;
    const rawSave = Math.min(Math.round((sub * pct) / 100), cap);
    const afterBoxTotal = Math.ceil(Math.max(0, sub - rawSave) / 250) * 250;
    const saving = sub - afterBoxTotal;
    // المستوى التالي: كم كيساً ناقصاً وكم يمنح
    const next = tiers
      .filter((t) => t.bags > bags)
      .sort((a, b) => a.bags - b.bags)[0];
    return { bags, saving, pct, free, gift, next, avgPrice: Math.round(sub / Math.max(1, bags)) };
  }, [cart, config.boxTiers]);

  const afterBox = subtotal - box.discount;
  /* ═ المعاينة الحية من الخادم — نفس حساب صفحة الدفع تماماً ═
     تضمن أن ما يراه الزبون في السلة (خصم الرحلة، التوصيل المجاني، الهدية، الكاش)
     هو نفسه في الدفع، بلا مفاجآت. */
  const [preview, setPreview] = useState<{
    itemsSubtotal: number; boxDiscount: number; couponDiscount: number;
    journeyDiscount: number; journeyPct: number; giftName: string | null;
    pointsAvailable: number; pointsUsedDinars: number; pointsRemaining: number;
    deliveryCharged: number; freeDelivery: boolean; total: number;
  } | null>(null);

  useEffect(() => {
    if (cart.length === 0) { setPreview(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/checkout/preview/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          items: cart.map((i) => ({ slug: i.slug, variant: i.variant, qty: i.qty, boxGroup: i.boxGroup, variantId: i.variantId ?? null })),
          phone: me.phone ?? "",
          couponCode: coupon?.code ?? null,
          usePoints: useCashback,
          boxGiftChoice,
        }),
      }).then((r) => r.json()).then((d) => { if (!d?.error) setPreview(d); }).catch(() => {});
    }, 40);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [cart, me.phone, coupon, useCashback, boxGiftChoice]);

  // قيم العرض: من الخادم إن توفّرت، وإلا تقدير محلي حتى تصل
  const couponDiscount = preview?.couponDiscount ?? (
    coupon?.type === "PERCENT" ? Math.round((afterBox * coupon.value) / 100)
    : coupon?.type === "FIXED" ? Math.min(coupon.value, afterBox) : 0);
  const journeyDiscount = preview?.journeyDiscount ?? 0;
  const journeyPct = preview?.journeyPct ?? 0;
  const giftName = preview?.giftName ?? null;
  const cashAvailable = preview?.pointsAvailable ?? (me.pointsValueDinars ?? 0);
  const pointsDinars = preview?.pointsUsedDinars ?? 0;
  const cashRemaining = preview?.pointsRemaining ?? cashAvailable;
  const freeDelivery = preview?.freeDelivery ?? (box.freeDelivery || coupon?.type === "FREE_DELIVERY");
  const delivery = preview?.deliveryCharged ?? (freeDelivery ? 0 : config.deliveryPrice);
  const itemsAfterAll = preview?.itemsSubtotal ?? afterBox;
  const previewTotal = preview?.total ?? (Math.max(0, afterBox - couponDiscount) + delivery);

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
        <p className="text-5xl">🛍</p>
        <h1 className="mt-5 text-2xl font-bold">سلتك فارغة</h1>
        <p className="mt-2 text-sm text-muted">ابدأ من محاصيلنا — أو خلّي البوكس يوفّرلك</p>
        <div className="mt-7 flex gap-3">
          <Link href="/products/?cat=coffee" className="btn btn-olive !px-6 !py-3 text-sm">تسوّق القهوة</Link>
          <Link href="/box/" className="btn btn-ghost !px-6 !py-3 text-sm">بناء البوكس</Link>
        </div>
      </div>
    );

  return (
    <div ref={scope} className="mx-auto max-w-5xl px-4 pb-28 pt-28 md:px-8 md:pt-32">
      <h1 className="text-[26px] font-bold md:text-3xl">سلّتك</h1>

      {/* تقدّم واضح */}
      <div className="mt-4 flex items-center gap-2.5">
        <span className="text-[12px] font-bold text-clay">١ السلة</span>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] text-muted">٢ التوصيل</span>
        <span className="h-px flex-1 bg-line" />
        <span className="text-[12px] text-muted">٣ التأكيد</span>
      </div>

      {/* شريط تقدّم التوصيل المجاني */}
      {/* فرصة البوكس — تحويل بضغطة أو دعوة لإضافة كيس */}
      {boxChance && (
        boxChance.saving > 0 ? (
          <div className="mt-5 rounded-[5px] border border-gold/35 bg-gold/8 p-4">
            <p className="text-[13.5px] font-bold leading-snug">
              أكياسك الـ<span className="font-num">{boxChance.bags}</span> تصلح بوكس —
              وفّر <span className="font-num text-accent">{formatIQD(boxChance.saving)}</span>
              {boxChance.free ? " مع توصيل مجاني" : ""}{boxChance.gift ? " وهدية" : ""}
            </p>
            <button onClick={convertToBox}
              className="btn btn-clay mt-3 flex w-full items-center justify-center !py-2.5 text-[13px] active:scale-[0.98]">
              حوّلها لبوكس ووفّر {boxChance.pct}٪
            </button>
          </div>
        ) : boxChance.next ? (
          <Link href="/box/" className="mt-5 flex items-center justify-between gap-3 rounded-[5px] border border-line bg-card p-4 active:scale-[0.99]">
            <p className="text-[13px] font-semibold leading-snug">
              أضِف <span className="font-num text-accent">{boxChance.next.bags - boxChance.bags}</span>
              {boxChance.next.bags - boxChance.bags === 1 ? " كيساً" : " أكياس"} وتبدأ خصومات البوكس
              {boxChance.next.rewardType === "PERCENT" ? ` (${boxChance.next.value}٪)` : ""}
            </p>
            <ArrowLeft size={16} className="shrink-0 text-accent" />
          </Link>
        ) : null
      )}

      {config.freeDeliveryThreshold > 0 && !freeDelivery && (() => {
        const remaining = config.freeDeliveryThreshold - subtotal;
        const pct = Math.min(100, (subtotal / config.freeDeliveryThreshold) * 100);
        return (
          <div className="mt-5 rounded-[5px] border border-line bg-card p-4">
            {remaining > 0 ? (
              <p className="text-[13px] font-semibold">
                أضِف <span className="font-num text-accent">{formatIQD(remaining)}</span> وتحصل على <span className="text-ok">توصيل مجّاني</span>
              </p>
            ) : (
              <p className="text-[13px] font-semibold text-ok">حصلت على توصيل مجّاني ✓</p>
            )}
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-bg-alt">
              <div className="h-full rounded-full bg-gradient-to-l from-accent to-gold transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* الأسطر */}
        <div className="space-y-3">
          {/* حزم «خذها معاً» — بطاقة واحدة لكل حزمة */}
          {Array.from(new Set(cart.filter((i) => i.bundleId).map((i) => i.bundleId!))).map((bid) => {
            const items = cart.filter((i) => i.bundleId === bid);
            if (items.length === 0) return null;
            const sum = items.reduce((t, i) => t + i.priceShown * i.qty, 0);
            return (
              <div key={bid} className="rounded-[5px] border border-gold/40 bg-gold/6 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-accent">حزمة خذها معاً</p>
                    <div className="mt-2 flex flex-col gap-1">
                      {items.map((i) => (
                        <p key={i.key} className="truncate text-[12.5px] text-muted">
                          {i.name}{i.meta && i.meta !== "حزمة" ? ` · ${i.meta}` : ""}
                        </p>
                      ))}
                    </div>
                    <p className="font-num mt-2 text-[14px] font-bold">{formatIQD(sum)}</p>
                  </div>
                  <button onClick={() => removeFromCart(items[0].key)} aria-label="احذف الحزمة"
                    className="shrink-0 text-muted transition-colors hover:text-accent"><Trash2 size={17} /></button>
                </div>
                <p className="mt-2 text-[11.5px] text-muted">تُحذف كحزمة واحدة</p>
              </div>
            );
          })}

          {/* عناصر مفردة (خارج البوكس والحزم) */}
          {cart.filter((i) => i.boxGroup == null && !i.bundleId).map((i) => (
            <div key={i.key} className="flex items-center gap-4 rounded-[5px] border border-line bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{i.name}</p>
                {i.meta && <p className="mt-0.5 text-[12px] text-muted">{i.meta}</p>}
                <p className="font-num mt-1 text-[13px] font-semibold">{formatIQD(i.priceShown)}</p>
              </div>
              <div className="flex items-center gap-2.5 rounded-full border border-line px-2 py-1.5">
                <button onClick={() => setQty(i.key, i.qty - 1)} aria-label="أنقص" className="text-muted hover:text-ink"><Minus size={14} /></button>
                <span className="font-num w-5 text-center text-sm font-bold">{i.qty}</span>
                <button
                  onClick={() => {
                    const c = coffees.find((x) => x.slug === i.slug);
                    
                    const gramsPer = i.variant === "G1000" ? 1000 : i.variant === "G500" ? 500 : 250;
                    const max = c?.bagsLeft != null ? Math.floor((c.bagsLeft * 250) / gramsPer)
                      : 99;
                    if (i.qty >= max) { showToast(`هذا كل المتوفّر من ${i.name}`); return; }
                    setQty(i.key, i.qty + 1);
                  }}
                  aria-label="زد" className="text-muted hover:text-ink"><Plus size={14} /></button>
              </div>
              <button onClick={() => removeFromCart(i.key)} aria-label="احذف" className="text-muted transition-colors hover:text-accent"><Trash2 size={17} /></button>
            </div>
          ))}

          {/* البوكس — بطاقة واحدة مجمّعة */}
          {(() => {
            const boxItems = cart.filter((i) => i.boxGroup != null);
            if (boxItems.length === 0) return null;
            const boxBags = boxItems.reduce((t, i) => t + i.qty, 0);
            const boxSubtotal = boxItems.reduce((t, i) => t + i.priceShown * i.qty, 0);
            return (
              <div className="rounded-[5px] border border-gold/40 bg-gold/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-bold">
                    <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-gold">البوكس الثلاثي</span>
                    <span className="font-num text-[13px] text-muted">{boxBags} أكياس</span>
                  </p>
                  <button onClick={() => boxItems.forEach((i) => removeFromCart(i.key))} aria-label="احذف البوكس" className="text-muted transition-colors hover:text-accent"><Trash2 size={16} /></button>
                </div>
                <div className="mt-3 space-y-1.5 border-t border-gold/20 pt-3">
                  {boxItems.map((i) => (
                    <div key={i.key} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-muted">{i.name} <span className="font-num">×{i.qty}</span></span>
                      <span className="font-num">{formatIQD(i.priceShown * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gold/20 pt-3 text-[13px] font-bold">
                  <span>مجموع البوكس</span>
                  <span className="font-num">{formatIQD(boxSubtotal)}</span>
                </div>
                {(box.pct > 0 || box.freeDelivery || box.gift) && (
                  <p className="mt-2.5 text-[12px] font-semibold text-gold">
                    {box.pct > 0 && <>خصم {box.pct}٪ </>}
                    {box.freeDelivery && "· توصيل مجاني "}
                    {box.gift && (boxGiftChoice ? `· هدية «${boxGiftChoice}»` : "· هدية تختارها")}
                    <span className="text-muted"> — يُطبّق عند الإتمام</span>
                  </p>
                )}
              </div>
            );
          })()}

          {/* اقتراحات ذكية — محاصيل ليست بالسلة (ترفع قيمة الطلب) */}
          {(() => {
            const inCart = new Set(cart.map((i) => i.slug));
            const coffeePicks = coffees.filter((c) => !inCart.has(c.slug) && !c.soldOut).slice(0, 2);
            const toolPicks = tools.filter((t) => !inCart.has(t.slug) && !t.soldOut && (t.price ?? 0) > 0).slice(0, 2);
            const suggestions: { slug: string; name: string; price: number; img: string | null; isCoffee: boolean }[] = [
              ...coffeePicks.map((c) => ({ slug: c.slug, name: c.name, price: c.prices.g250, img: c.image ?? null, isCoffee: true })),
              ...toolPicks.map((t) => ({ slug: t.slug, name: t.name, price: t.price ?? 0, img: t.images?.[0] ?? null, isCoffee: false })),
            ];
            if (suggestions.length === 0) return null;
            return (
              <div className="mt-6 rounded-[5px] border border-line bg-card p-5">
                <p className="text-[14px] font-bold">أضِف إلى طلبك</p>
                <p className="mt-0.5 text-[12px] text-muted">تقرّبك من التوصيل المجّاني</p>
                <div className="mt-4 space-y-2.5">
                  {suggestions.map((it) => (
                    <div key={it.slug} className="flex items-center gap-3">
                      <Link href={`/product/?${it.isCoffee ? "c" : "t"}=${it.slug}`}
                        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-white">
                        {it.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.img} alt={it.name} className="h-full w-full object-cover" />
                        ) : <span className="font-num text-lg font-bold text-line">خزف</span>}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/product/?${it.isCoffee ? "c" : "t"}=${it.slug}`}>
                          <p className="truncate text-[13.5px] font-bold">{it.name}</p>
                        </Link>
                        <p className="font-num text-[12px] text-muted">{formatIQD(it.price)}</p>
                      </div>
                      <button
                        onClick={() => {
                          addToCart(it.isCoffee
                            ? { slug: it.slug, variant: "G250", grind: "حبوب كاملة", name: it.name, meta: "٢٥٠غ", priceShown: it.price }
                            : { slug: it.slug, variant: "PIECE", grind: "", name: it.name, meta: "", priceShown: it.price });
                          showToast(`أُضيف ${it.name}`);
                        }}
                        className="shrink-0 rounded-full border border-line px-4 py-2 text-[12.5px] font-bold text-accent transition-colors hover:border-accent">
                        إضافة
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="mt-4"><PaperCupsGift variant="card" /></div>

        {/* الملخص */}
        <aside className="h-fit space-y-4 rounded-[6px] border border-line bg-card p-6 lg:sticky lg:top-28">
          {/* كود الخصم */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Ticket size={14} /> كود الخصم</p>
            {coupon ? (
              <div className="flex items-center justify-between rounded-[4px] bg-ok/10 px-4 py-3 text-[13px] font-bold text-ok">
                <span className="font-num">{coupon.code}</span>
                <button onClick={() => setCoupon(null)} className="text-muted hover:text-accent">إزالة</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="كود الخصم"
                  className="font-num w-full rounded-[4px] border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
                />
                <button onClick={tryCoupon} disabled={checking} className="btn btn-ghost shrink-0 !px-4 !py-2.5 text-[13px] disabled:opacity-50">
                  {checking ? "…" : "تفعيل"}
                </button>
              </div>
            )}
          </div>

          {/* الرصيد */}
          {!me.guest && (me.pointsBalance ?? 0) > 0 && (
            <div>
              <label className="flex cursor-pointer items-center gap-3 rounded-[4px] border border-line bg-bg p-3.5">
                <input type="checkbox" checked={useCashback} onChange={(e) => setUseCashback(e.target.checked)} className="h-4 w-4 accent-[#c9a961]" />
                <Wallet size={16} className="text-gold" />
                <span className="text-[13px] font-bold">
                  استخدم رصيدك — <span className="font-num">{formatIQD(me.pointsValueDinars ?? 0)}</span> كاش باك
                </span>
              </label>
              {useCashback && pointsDinars > 0 && (
                <p className="mt-2 px-1 text-[12px] text-muted">
                  استُخدم <span className="font-num">{formatIQD(pointsDinars)}</span> من رصيدك · يبقى <span className="font-num">{formatIQD(cashRemaining)}</span> في حسابك
                </p>
              )}
            </div>
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
            {journeyDiscount > 0 && (
              <div className="flex justify-between text-ok">
                <span>مكافأة رحلتك{journeyPct > 0 ? ` (${journeyPct}٪)` : ""}</span>
                <span className="font-num font-semibold">−{formatIQD(journeyDiscount)}</span>
              </div>
            )}
            {giftName && (
              <div className="flex justify-between text-gold"><span>هدية رحلتك</span><span className="font-semibold">{giftName}</span></div>
            )}
            {pointsDinars > 0 && (
              <div className="flex justify-between text-gold"><span>الرصيد</span><span className="font-num font-semibold">−{formatIQD(pointsDinars)}</span></div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">رسوم التوصيل</span>
              {freeDelivery ? <span className="font-semibold text-ok">مجاني</span> : <span className="font-num font-semibold">{formatIQD(delivery)}</span>}
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-[16px] font-bold">
              <span>الإجمالي</span><span className="font-num">{formatIQD(previewTotal)}</span>
            </div>
            {previewTotal > 0 && (
              <p className="text-[11.5px] text-muted">
                وتكسب <span className="font-num font-bold text-clay">{formatIQD(Math.floor((itemsAfterAll * (config.cashbackPct ?? 3)) / 100))}</span> نقطة من هذا الطلب
              </p>
            )}
          </div>

          <Link href="/checkout/" className="btn btn-clay flex w-full items-center justify-center gap-2 !py-4 text-[15px] active:scale-[0.98]">
            إتمام الطلب <ArrowLeft size={16} />
          </Link>
          <p className="text-center text-[11px] text-muted">دفع عند الاستلام · توصيل موحّد لكل المحافظات</p>
        </aside>
      </div>

      {box.gift && !boxGiftChoice && (
        <Link href="/box/" className="mt-6 flex items-center justify-center gap-2 rounded-[5px] border border-gold/50 bg-gold/10 py-3.5 text-[13px] font-bold text-gold">
          <Gift size={15} /> وصلت لهدية البوكس — ارجع واختَرها
        </Link>
      )}
    </div>
  );
}
