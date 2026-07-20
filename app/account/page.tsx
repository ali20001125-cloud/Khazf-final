"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package, Heart, Wallet, ChevronLeft } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion } from "@/lib/motion";
import { CoffeeCard, ToolCard } from "@/components/Cards";

type JL = { level: number; rewardType: string; value: number; giftName: string | null };
type Order = { orderNumber: string; status: string; total: number; createdAt: string };
type Me = {
  guest?: boolean; googleSession?: boolean; linked?: boolean;
  name?: string; phone?: string; governorate?: string; address?: string;
  pointsBalance?: number; pointsValueDinars?: number;
  journeyOrders?: number; journeyLevels?: JL[]; orders?: Order[];
};

const rewardLabel = (l: JL) =>
  l.rewardType === "PERCENT" ? `خصم ${l.value}٪`
  : l.rewardType === "FREE_DELIVERY" ? "توصيل مجاني"
  : l.giftName ?? "هدية";

const statusText = (s: string) =>
  s === "DELIVERED" ? "تم التوصيل" : s === "CANCELLED" ? "ملغى" : "قيد التنفيذ";

export default function AccountPage() {
  return <Suspense><AccountInner /></Suspense>;
}

function AccountInner() {
  const scope = useMotion();
  const params = useSearchParams();
  const { favorites } = useStore();
  const { coffees, tools } = useCatalog();
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"orders" | "cashback" | "fav">(params.get("tab") === "fav" ? "fav" : "orders");

  useEffect(() => {
    fetch("/api/customer/me/").then((r) => r.json()).then(setMe).catch(() => setMe({ guest: true }));
  }, []);

  const favItems = [...coffees, ...tools].filter((p) => favorites.includes(p.slug));

  /* تحميل */
  if (!me) return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-28 md:px-8">
      <div className="h-40 animate-pulse rounded-[24px] bg-bg-alt" />
      <div className="mt-4 h-56 animate-pulse rounded-[24px] bg-bg-alt" />
    </div>
  );

  /* ═══ زائر تماماً — شاشة دخول احترافية ═══ */
  if (me.guest && !me.googleSession) return <SignedOutView />;

  /* ═══ دخل بـ Google لكن لم يربط رقمه — خطوة الربط ═══ */
  if (me.guest && me.googleSession) return <LinkStep />;

  /* ═══ حساب كامل ═══ */
  return (
    <div ref={scope} className="mx-auto max-w-3xl px-4 pb-24 pt-28 md:px-8 md:pt-32">
      {/* بطاقة الرصيد + الرحلة */}
      <div className="reveal rounded-[24px] bg-olive p-6 text-olive-text md:p-7">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] opacity-80">أهلاً {me.name || "بك"}</p>
            <p className="font-num mt-3 text-3xl font-bold">
              {(me.pointsValueDinars ?? 0).toLocaleString("en")}<span className="ms-1 text-base font-semibold">د.ع</span>
            </p>
            <p className="font-num mt-1 text-[11.5px] opacity-70">رصيد الكاش باك · {me.pointsBalance ?? 0} نقطة</p>
          </div>
          <span className="font-num rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-olive">
            {Math.min(me.journeyOrders ?? 0, 6)}/6
          </span>
        </div>
        <div className="mt-6 flex items-center gap-1.5">
          {(me.journeyLevels ?? []).slice(0, 6).map((l) => {
            const done = (me.journeyOrders ?? 0) >= l.level;
            return (
              <div key={l.level} className="flex-1 text-center">
                <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${done ? "bg-gold text-olive" : "bg-olive-text/15 text-olive-text/70"}`}>
                  {done ? "✓" : l.level}
                </div>
                <p className="mt-1.5 text-[8px] leading-tight opacity-80">{rewardLabel(l)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* التبويبات */}
      <div className="reveal mt-5 flex gap-2">
        {([["orders", "طلباتي", Package], ["cashback", "الكاش باك", Wallet], ["fav", "المفضلة", Heart]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] border py-3 text-[13px] font-bold transition-all ${
              tab === k ? "border-olive bg-olive text-olive-text" : "border-line bg-card text-muted"
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="reveal mt-5">
        {tab === "orders" && (
          (me.orders ?? []).length > 0 ? (
            <div className="space-y-2.5">
              {me.orders!.map((o) => (
                <Link key={o.orderNumber} href={`/invoice/?n=${o.orderNumber}&p=${me.phone}`}
                  className="flex items-center justify-between rounded-[16px] border border-line bg-card px-5 py-4 transition-all hover:border-muted">
                  <div>
                    <p className="font-num text-[14px] font-bold">{o.orderNumber}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{statusText(o.status)} · {new Date(o.createdAt).toLocaleDateString("ar-IQ", { dateStyle: "medium" })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-num text-[13px] font-bold">{formatIQD(o.total)}</span>
                    <ChevronLeft size={16} className="text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          ) : <Empty icon={Package} text="ما عندك طلبات بعد" cta />
        )}

        {tab === "cashback" && (
          <div className="rounded-[20px] border border-line bg-card p-6 text-center">
            <Wallet size={22} className="mx-auto text-accent" />
            <p className="font-num mt-3 text-2xl font-bold">{(me.pointsValueDinars ?? 0).toLocaleString("en")} د.ع</p>
            <p className="mt-1 text-[12px] text-muted">{me.pointsBalance ?? 0} نقطة — تُخصم تلقائياً من طلبك الجاي</p>
            <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
              كل ١٬٠٠٠ دينار تشتريها = نقطة كاش باك، تتفعّل فور توصيل طلبك
            </p>
          </div>
        )}

        {tab === "fav" && (
          favItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {favItems.map((it) =>
                "type" in it && it.type === "TOOL" ? <ToolCard key={it.slug} tool={it as never} /> : <CoffeeCard key={it.slug} coffee={it as never} />
              )}
            </div>
          ) : <Empty icon={Heart} text="ما عندك مفضلة بعد" cta />
        )}
      </div>

      {/* ربط Google (للمسجّل برقمه بلا Google) */}
      {!me.googleSession && <ConnectGoogleHint />}
    </div>
  );
}

function Empty({ icon: Icon, text, cta }: { icon: typeof Package; text: string; cta?: boolean }) {
  return (
    <div className="rounded-[20px] border border-dashed border-line bg-card p-10 text-center">
      <Icon size={26} className="mx-auto text-muted" />
      <p className="mt-3 text-[13.5px] font-semibold text-muted">{text}</p>
      {cta && <Link href="/products/?cat=coffee" className="mt-4 inline-block rounded-full bg-olive px-6 py-2.5 text-[13px] font-bold text-olive-text">تسوّق الآن</Link>}
    </div>
  );
}

/* دخول Google بضغطة */
async function startGoogle() {
  const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
  if (!supabaseEnabled) return;
  const sb = supabaseBrowser();
  await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback/?next=/account/` } });
}

function GoogleBtn({ label = "المتابعة عبر Google" }: { label?: string }) {
  return (
    <button onClick={startGoogle}
      className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-card py-4 text-[14.5px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]">
      <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      {label}
    </button>
  );
}

/* ═══ شاشة الزائر — نظيفة واحترافية ═══ */
function SignedOutView() {
  const scope = useMotion();
  return (
    <div ref={scope} className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 pb-20 pt-28">
      <h1 className="reveal text-center text-[26px] font-bold">حسابك في خزف</h1>
      <p className="reveal mx-auto mt-3 max-w-xs text-center text-[13.5px] leading-relaxed text-muted">
        ادخل بـ Google حتى توصلك طلباتك ونقاطك على أي جهاز — أو اطلب مباشرة بلا تسجيل.
      </p>
      <div className="reveal mt-8 space-y-3">
        <GoogleBtn />
        <Link href="/products/?cat=coffee"
          className="block rounded-[16px] bg-olive py-4 text-center text-[14.5px] font-bold text-olive-text active:scale-[0.98]">
          تسوّق كزائر
        </Link>
      </div>
      <p className="reveal mt-6 text-center text-[11.5px] leading-relaxed text-muted">
        كزائر: نقاطك تُحفظ برقم هاتفك وتُطبّق تلقائياً على طلباتك.
      </p>
    </div>
  );
}

/* ═══ خطوة ربط الرقم بعد Google ═══ */
function LinkStep() {
  const { showToast } = useStore();
  const [phone, setPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    if (phone.length < 10) return showToast("اكتب رقم هاتفك");
    setBusy(true);
    try {
      const r = await fetch("/api/customer/link/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, orderNumber }),
      });
      const d = await r.json();
      if (!r.ok) showToast(d.error ?? "تعذّر الربط");
      else { showToast("تم ✓"); location.reload(); }
    } catch { showToast("تعذّر الاتصال"); }
    setBusy(false);
  };
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 pb-20 pt-28">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok/12 text-ok">✓</div>
      <h1 className="mt-4 text-center text-[24px] font-bold">دخلت بنجاح</h1>
      <p className="mx-auto mt-3 max-w-xs text-center text-[13.5px] leading-relaxed text-muted">
        خطوة أخيرة لمرة واحدة: اكتب رقم هاتفك حتى نربط حسابك وتظهر طلباتك ونقاطك.
      </p>
      <div className="mt-7 space-y-3">
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11}
          placeholder="رقم الهاتف — 07XXXXXXXXX" dir="ltr"
          className="font-num w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-[14px] outline-none focus:border-gold" />
        <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="رقم طلب سابق (اختياري — لاستعادة نقاطك)" dir="ltr"
          className="font-num w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-[13px] outline-none focus:border-gold" />
        <button onClick={link} disabled={busy}
          className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
          {busy ? "لحظة…" : "ربط الحساب"}
        </button>
      </div>
    </div>
  );
}

/* تلميح ربط Google لمن يدخل برقمه فقط */
function ConnectGoogleHint() {
  return (
    <div className="reveal mt-6 rounded-[18px] border border-dashed border-line bg-card p-5 text-center">
      <p className="text-[13px] font-bold">اربط Google لحسابك</p>
      <p className="mx-auto mt-1 mb-3 max-w-xs text-[11.5px] leading-relaxed text-muted">
        حتى توصل لطلباتك ونقاطك من أي جهاز بضغطة، بلا رقم
      </p>
      <div className="mx-auto max-w-xs"><GoogleBtn label="ربط عبر Google" /></div>
    </div>
  );
}
