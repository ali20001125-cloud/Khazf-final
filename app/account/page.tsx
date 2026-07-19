"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Package, Heart, Wallet, MapPin, Settings, RotateCcw } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { useStore } from "@/lib/store";
import { useMotion } from "@/lib/motion";
import { CoffeeCard, ToolCard } from "@/components/Cards";

const tabs = [
  { key: "orders", label: "الطلبات", Icon: Package },
  { key: "fav", label: "المفضلة", Icon: Heart },
  { key: "cashback", label: "الكاش باك", Icon: Wallet },
];

function AccountInner() {
  const params = useSearchParams();
  const scope = useMotion();
  const { favorites, showToast } = useStore();
  const { coffees, tools } = useCatalog();
  type JL = { level: number; rewardType: string; value: number; giftName: string | null };
type Me = { guest?: boolean; googleSession?: boolean; linked?: boolean; name?: string; phone?: string; journeyLevels?: JL[]; pointsBalance?: number; pointsValueDinars?: number;
    journeyOrders?: number; orders?: { orderNumber: string; status: string; total: number; createdAt: string }[] };
  const [me, setMe] = useState<Me>({ guest: true });
  useEffect(() => { fetch("/api/customer/me").then((r) => r.json()).then(setMe).catch(() => {}); }, []);
  const [tab, setTab] = useState(params.get("tab") === "fav" ? "fav" : "orders");

  const favItems = favorites
    .map((id) => {
      const [k, slug] = id.split(":");
      return k === "c" ? coffees.find((c) => c.slug === slug) : tools.find((t) => t.slug === slug);
    })
    .filter(Boolean);

  return (
    <div ref={scope} className="mx-auto max-w-5xl px-4 pb-24 pt-28 md:px-8 md:pt-32">
      {/* ربط Google بجلسة غير مربوطة — إثبات ملكية */}
      {me.googleSession && !me.linked && <LinkCard onLinked={() => location.reload()} />}

      {/* البطاقة العلوية */}
      <div className="reveal flex items-center gap-4 rounded-[22px] border border-line bg-card p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive text-olive-text">
          <User size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{me.name ?? "زائر"}</h1>
          <p className="font-num text-[12px] text-muted" dir="ltr">{me.phone ?? "سجّل بطلبك الأول"}</p>
        </div>
      </div>

      {/* بطاقة الولاء — النقاط والرحلة بمكان واحد واضح */}
      {!me.guest && (
        <div className="reveal mt-4 rounded-[22px] bg-olive p-6 text-olive-text">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] opacity-80">رصيد الكاش باك</p>
              <p className="font-num mt-1 text-3xl font-bold">
                {((me.pointsBalance ?? 0) * 0 + (me.pointsValueDinars ?? 0)).toLocaleString("en")} <span className="text-sm font-semibold">د.ع</span>
              </p>
              <p className="font-num mt-0.5 text-[11px] opacity-70">{me.pointsBalance ?? 0} نقطة · تتفعّل فور توصيل طلبك</p>
            </div>
            <p className="font-num rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-olive">
              رحلتك {Math.min(me.journeyOrders ?? 0, 6)}/6
            </p>
          </div>
          {/* مسار الرحلة */}
          <div className="mt-5 flex items-center gap-1.5">
            {(me.journeyLevels ?? []).slice(0, 6).map((l) => {
              const doneStep = (me.journeyOrders ?? 0) >= l.level;
              const label = l.rewardType === "PERCENT" ? `خصم ${l.value}٪`
                : l.rewardType === "FREE_DELIVERY" ? "توصيل مجاني"
                : l.giftName ?? "هدية";
              return (
                <div key={l.level} className="flex-1 text-center">
                  <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${doneStep ? "bg-gold text-olive" : "bg-olive-text/15"}`}>
                    {doneStep ? "✓" : l.level}
                  </div>
                  <p className="mt-1.5 text-[8.5px] leading-tight opacity-80">{label}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed opacity-80">
            كل طلب يقرّبك لمكافأة تنصرف تلقائياً بطلبك الجاي — وكل ١٬٠٠٠ د = نقطة كاش باك
          </p>
        </div>
      )}

      {/* التبويبات */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-bold transition-colors ${
              tab === t.key ? "border-olive bg-olive text-olive-text" : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="mt-8">
        {tab === "orders" && (
          me.orders && me.orders.length > 0 ? (
            <ul className="reveal-group space-y-3">
              {me.orders.map((o) => (
                <li key={o.orderNumber} className="flex flex-wrap items-center gap-4 rounded-[16px] border border-line bg-card p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-num text-sm font-bold">{o.orderNumber}</span>
                      <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                        o.status === "DELIVERED" ? "bg-ok/10 text-ok" : o.status === "CANCELLED" ? "bg-accent/10 text-accent" : "bg-gold/10 text-gold"
                      }`}>
                        {o.status === "DELIVERED" ? "تم التوصيل" : o.status === "CANCELLED" ? "أُلغي" : "قيد التجهيز"}
                      </span>
                    </div>
                    <p className="font-num mt-1 text-[11px] text-muted/70">{new Date(o.createdAt).toLocaleDateString("ar-IQ")}</p>
                  </div>
                  <span className="font-num text-sm font-bold">{formatIQD(o.total)}</span>
                </li>
              ))}
              <Link href="/track/" className="block rounded-[16px] border border-dashed border-line py-4 text-center text-[13px] font-bold text-muted transition-colors hover:border-accent hover:text-accent">
                تتبع طلب برقمه ←
              </Link>
            </ul>
          ) : (
            <div className="rounded-[20px] border border-dashed border-line py-16 text-center">
              <Package size={26} className="mx-auto text-muted" />
              <p className="mt-3 text-sm text-muted">ما عندك طلبات بعد — أول طلب يفتح رحلة مكافآتك</p>
              <Link href="/products/?cat=coffee" className="btn btn-clay mt-6 inline-block !px-7 !py-3 text-sm">تسوّق القهوة</Link>
            </div>
          )
        )}

        {tab === "fav" && (
          favItems.length > 0 ? (
            <div className="reveal-group grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {favItems.map((item) =>
                item && "prices" in item ? (
                  <CoffeeCard key={item.slug} coffee={item} />
                ) : item ? (
                  <ToolCard key={item.slug} tool={item} />
                ) : null
              )}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-line py-16 text-center">
              <Heart size={26} className="mx-auto text-muted" />
              <p className="mt-3 text-sm text-muted">ما عندك مفضلات بعد — اضغط القلب على أي منتج</p>
              <Link href="/products/?cat=all" className="btn btn-clay mt-6 inline-block !px-7 !py-3 text-sm">تصفّح المتجر</Link>
            </div>
          )
        )}

        {tab === "cashback" && (
          <div className="reveal rounded-[22px] border border-line bg-card p-8 text-center">
            <p className="text-[12px] text-muted">رصيدك الحالي</p>
            <p className="font-num mt-2 text-4xl font-bold text-gold">{formatIQD(me.pointsValueDinars ?? 0)}</p>
            <p className="mt-3 text-[13px] text-muted">تجمع ٣٪ من كل طلب — وتستخدمه خصماً من السلة</p>
            <Link href="/cashback/" className="btn btn-olive mt-6 inline-block !px-8 !py-3.5 text-sm">
              تفاصيل الكاش باك والعمليات
            </Link>
          </div>
        )}

        

        
      </div>
    </div>
  );
}

function LinkCard({ onLinked }: { onLinked: () => void }) {
  const { showToast } = useStore();
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/customer/link/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, orderNumber }),
      });
      const d = await r.json();
      if (!r.ok) showToast(d.error ?? "تعذّر الربط");
      else { showToast("تم ربط حسابك ✓"); onLinked(); }
    } catch { showToast("تعذّر الاتصال"); }
    setBusy(false);
  };
  return (
    <div className="reveal mb-6 rounded-[20px] border border-gold/50 bg-gold/8 p-5">
      <p className="text-sm font-bold">اربط رقمك بحساب Google</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">
        حتى تشوف طلباتك ونقاطك من أي جهاز — أدخل هاتفك ورقم أي طلب سابق (موجود برسالة التأكيد)
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11}
          placeholder="07XXXXXXXXX" dir="ltr"
          className="font-num rounded-[12px] border border-line bg-bg px-4 py-3 text-end text-sm outline-none focus:border-gold" />
        <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="KHZ-1234" dir="ltr"
          className="font-num rounded-[12px] border border-line bg-bg px-4 py-3 text-end text-sm outline-none focus:border-gold" />
        <button onClick={link} disabled={busy}
          className="btn rounded-[12px] !px-6 !py-3 text-sm text-olive disabled:opacity-50" style={{ background: "var(--gold)" }}>
          {busy ? "…" : "اربط"}
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountInner />
    </Suspense>
  );
}
