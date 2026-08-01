"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package, Heart, Wallet, ChevronLeft, Eye, EyeOff, RotateCcw } from "lucide-react";
import { fmtDate } from "@/lib/datetime";
import OrderTimeline from "@/components/OrderTimeline";
import { formatIQD, governorates } from "@/lib/data";
import { normalizeIqPhone } from "@/lib/phone";
import { useStore } from "@/lib/store";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion } from "@/lib/motion";
import { CoffeeCard, ToolCard } from "@/components/Cards";

type JL = { level: number; rewardType: string; value: number; giftName: string | null };
type OrderItem = { productId: number | null; slug: string | null; name: string; variant: string; qty: number };
type Order = { orderNumber: string; status: string; total: number; createdAt: string; items?: OrderItem[] };
type Me = {
  guest?: boolean; googleSession?: boolean; linked?: boolean; hasAuth?: boolean;
  email?: string | null;
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
  const { favorites, addToCart, showToast } = useStore();
  const { coffees, tools } = useCatalog();

  // إعادة طلب سابق: يضيف المنتجات المتوفّرة للسلة (يتحقّق من التوفّر والسعر الحالي)
  const reorder = (items: OrderItem[]) => {
    let added = 0, skipped = 0;
    for (const it of items) {
      if (!it.slug) { skipped++; continue; } // هدايا/بنود بلا منتج
      const coffee = coffees.find((c) => c.slug === it.slug);
      const tool = tools.find((t) => t.slug === it.slug);
      if (coffee) {
        const price = it.variant === "G500" ? coffee.prices.g500
          : it.variant === "G1000" ? coffee.prices.g1000 : coffee.prices.g250;
        if (price == null) { skipped++; continue; }
        const label = it.variant === "G500" ? "٥٠٠غ" : it.variant === "G1000" ? "كيلو" : "٢٥٠غ";
        addToCart({ slug: coffee.slug, variant: it.variant as "G250" | "G500" | "G1000",
          grind: "حبوب كاملة", name: coffee.name, meta: `${label} · حبوب كاملة`, priceShown: price }, it.qty, true);
        added++;
      } else if (tool) {
        addToCart({ slug: tool.slug, variant: "PIECE", grind: "", name: tool.name,
          meta: "", priceShown: tool.price }, it.qty, true);
        added++;
      } else {
        skipped++; // المنتج لم يعد متوفّراً
      }
    }
    if (added > 0) showToast(skipped > 0
      ? `أُضيف ${added} منتج للسلة · ${skipped} لم يعد متوفّراً`
      : `أُضيفت منتجات طلبك للسلة`);
    else showToast("عذراً، منتجات هذا الطلب لم تعد متوفّرة");
  };
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<"orders" | "cashback" | "fav">(params.get("tab") === "fav" ? "fav" : "orders");
  const [editing, setEditing] = useState(false);

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

  /* دخل بـ Google/إيميل بلا رقم بعد — يدخل حسابه مباشرة (الرقم يُطلب عند الطلب) */
  // (أُزيلت خطوة LinkStep الإجبارية — لم نعد نطلب الرقم عند الدخول)

  /* ═══ حساب كامل ═══ */
  const inCycle = (me.journeyOrders ?? 0) % 6;
  const nextLevel = (me.journeyLevels ?? []).find((l) => l.level === inCycle + 1);

  return (
    <div ref={scope} className="mx-auto max-w-2xl px-5 pb-24 pt-28 md:pt-32">
      {/* ترويسة: تحية + بيانات مختصرة */}
      <div className="reveal mb-6">
        <h1 className="text-[26px] font-bold tracking-tight">أهلاً، {me.name || "صديق خزف"}</h1>
        {(me.email || me.phone) && (
          <p className="font-num mt-1.5 text-[12.5px] text-muted" dir="ltr">
            {[me.phone, me.email].filter(Boolean).join("  ·  ")}
          </p>
        )}
      </div>

      {/* بطاقة الرصيد — هادئة، الرقم هو البطل */}
      <div className="reveal rounded-[22px] bg-olive p-7 text-olive-text">
        <p className="text-[12px] font-semibold opacity-70">رصيد الكاش باك</p>
        <p className="font-num mt-1.5 text-[40px] font-bold leading-none">
          {(me.pointsValueDinars ?? 0).toLocaleString("en")}
          <span className="ms-2 text-lg font-semibold opacity-80">د.ع</span>
        </p>
        <p className="font-num mt-2 text-[11.5px] opacity-65">تُخصم تلقائياً من طلبك القادم</p>
      </div>

      {/* رحلة الولاء — شريط بسيط وواضح */}
      <div className="reveal mt-4 rounded-[22px] border border-line bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-bold">رحلة الولاء</p>
          <span className="font-num text-[12px] font-semibold text-muted">{inCycle}/6</span>
        </div>
        <div className="flex items-center gap-2">
          {(me.journeyLevels ?? []).slice(0, 6).map((l) => {
            const done = l.level <= inCycle;
            const isNext = l.level === inCycle + 1;
            return (
              <div key={l.level}
                className={`flex h-9 flex-1 items-center justify-center rounded-full text-[12px] font-bold transition-all ${
                  done ? "bg-olive text-olive-text"
                  : isNext ? "bg-gold/25 text-ink ring-1 ring-gold"
                  : "bg-bg text-muted/50"}`}>
                {done ? "✓" : l.level}
              </div>
            );
          })}
        </div>
        {nextLevel && (
          <p className="mt-4 text-center text-[12.5px] text-muted">
            طلبك القادم يمنحك <span className="font-bold text-accent">{rewardLabel(nextLevel)}</span>
          </p>
        )}
      </div>

      {/* التبويبات — واضحة */}
      <div className="reveal mt-6 flex gap-2">
        {([["orders", "طلباتي", Package], ["cashback", "الكاش باك", Wallet], ["fav", "المفضلة", Heart]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3 text-[13px] font-bold transition-all ${
              tab === k ? "bg-ink text-cream" : "bg-card text-muted"
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* المحتوى */}
      <div className="reveal mt-4">
        {tab === "orders" && (
          (me.orders ?? []).length > 0 ? (
            <div className="space-y-2.5">
              {me.orders!.map((o) => {
                const firstSlug = o.items?.find((it) => it.slug)?.slug;
                const img = firstSlug
                  ? (coffees.find((c) => c.slug === firstSlug)?.image
                     ?? tools.find((t) => t.slug === firstSlug)?.images?.[0])
                  : undefined;
                return (
                <div key={o.orderNumber}
                  className="rounded-[16px] border border-line bg-card px-5 py-4">
                  <Link href={`/invoice/?n=${o.orderNumber}&p=${me.phone}`}
                    className="flex items-center gap-3 transition-all active:scale-[0.99]">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-bg-alt">
                      {img
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={img} alt="" className="h-full w-full object-cover" />
                        : <span className="flex h-full w-full items-center justify-center text-[16px]">☕</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-num text-[14px] font-bold">{o.orderNumber}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted">{statusText(o.status)} · {fmtDate(o.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-num text-[13px] font-bold">{formatIQD(o.total)}</span>
                      <ChevronLeft size={16} className="text-muted" />
                    </div>
                  </Link>

                  <OrderTimeline createdAt={o.createdAt} status={o.status} />

                  {(o.items?.length ?? 0) > 0 && (
                    <button onClick={() => reorder(o.items!)}
                      className="btn btn-clay mt-3.5 flex w-full items-center justify-center gap-2 !py-3 text-[13.5px] active:scale-[0.98]">
                      <RotateCcw size={15} /> إعادة الطلب
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          ) : <Empty icon={Package} text="ما عندك طلبات بعد" cta />
        )}

        {tab === "cashback" && (
          <div className="rounded-[20px] border border-line bg-card p-7 text-center">
            <Wallet size={24} className="mx-auto text-accent" />
            <p className="font-num mt-4 text-3xl font-bold">{(me.pointsValueDinars ?? 0).toLocaleString("en")} د.ع</p>
            <p className="mt-1.5 text-[12px] text-muted">رصيدك من الكاش باك</p>
            <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
              كل ١٬٠٠٠ دينار تشتريها = ٣٠ دينار كاش باك، تتفعّل فور توصيل طلبك وتُخصم من طلبك القادم
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

      {/* ربط Google — فقط لمن ليس لديه أي حساب مصادقة */}
      {!me.hasAuth && !me.googleSession && <ConnectGoogleHint />}

      {/* أزرار الحساب */}
      <div className="reveal mt-8 flex items-center justify-center gap-6">
        <button onClick={() => setEditing(true)} className="text-[13px] font-bold text-accent">
          تعديل بياناتي
        </button>
        <span className="h-4 w-px bg-line" />
        <button onClick={signOut} className="text-[13px] font-semibold text-muted">
          تسجيل الخروج
        </button>
      </div>

      {editing && <EditProfile me={me} onClose={() => setEditing(false)} />}
    </div>
  );
}

/* ═══ نافذة تعديل البيانات ═══ */
function EditProfile({ me, onClose }: { me: Me; onClose: () => void }) {
  const [name, setName] = useState(me.name ?? "");
  const [email, setEmail] = useState(me.email ?? "");
  const [phone, setPhone] = useState(me.phone ?? "");
  const [gov, setGov] = useState(me.governorate ?? "");
  const [address, setAddress] = useState(me.address ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const phoneChanged = normalizeIqPhone(phone) !== me.phone;

  const save = async () => {
    setErr("");
    if (!name.trim()) return setErr("اكتب اسمك");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setErr("إيميل غير صحيح");
    if (phone && !normalizeIqPhone(phone)) return setErr("رقم هاتف عراقي صحيح");
    if (!gov) return setErr("اختر محافظتك");
    setBusy(true);
    try {
      const r = await fetch("/api/customer/update/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, governorate: gov, address }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || "تعذّر الحفظ"); setBusy(false); return; }
      setOk(true);
      setTimeout(() => location.reload(), 900);
    } catch { setErr("تعذّر الاتصال"); setBusy(false); }
  };

  const inp = "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[28px] bg-cream p-6 md:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line md:hidden" />
        <h2 className="text-[19px] font-bold">تعديل بياناتي</h2>
        <p className="mt-1 text-[12px] text-muted">حدّث معلوماتك — تُحفظ فوراً</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-muted">الاسم</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-muted">الإيميل</label>
            <input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="اختياري" className={`${inp} text-end`} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-muted">رقم الهاتف</label>
            <input dir="ltr" inputMode="tel" maxLength={11} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className={`font-num ${inp} text-end`} />
            {phoneChanged && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-accent">
                تغيير الرقم ينقل طلباتك ونقاطك ورحلة ولائك للرقم الجديد.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-muted">المحافظة</label>
            <select value={gov} onChange={(e) => setGov(e.target.value)} className={`appearance-none ${inp} ${gov ? "" : "text-muted"}`}>
              <option value="" disabled>اختر محافظتك</option>
              {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-muted">العنوان (اختياري)</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="أقرب نقطة دالّة" className={inp} />
          </div>

          {err && <p className="rounded-[12px] bg-accent/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-accent">{err}</p>}
          {ok && <p className="rounded-[12px] bg-olive/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-olive">حُفظت بياناتك ✓</p>}

          <div className="flex gap-2.5 pt-1">
            <button onClick={onClose} className="flex-1 rounded-[14px] border border-line bg-card py-3.5 text-[14px] font-bold text-muted active:scale-[0.98]">
              إلغاء
            </button>
            <button onClick={save} disabled={busy || ok}
              className="flex-[1.5] rounded-[14px] bg-olive py-3.5 text-[14px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
              {busy ? "لحظة…" : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
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

/* ═══ الزائر: دخول + تسجيل موحّد (Google + إيميل كامل) ═══ */
/* تحقّق ذكي من الإيميل: يكشف أخطاء البنية والنطاقات الشائعة، ويقترح التصحيح */
const COMMON_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
  "icloud.com", "live.com", "protonmail.com", "yahoo.co.uk",
  "khazf.shop", "me.com", "aol.com", "mail.com",
];
// أخطاء إملائية شائعة → التصحيح (سريعة، تُفحص أولاً)
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gamil.com": "gmail.com", "gmai.com": "gmail.com",
  "gmil.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmail.cm": "gmail.com", "gmailcom": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmil.com": "hotmail.com", "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com", "outlok.com": "outlook.com", "outook.com": "outlook.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "iclod.com": "icloud.com",
};

/** مسافة التشابه (Levenshtein): كم تعديل يفصل كلمتين */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, d[j], d[j - 1]) + 1;
      prev = tmp;
    }
  }
  return d[n];
}

/** يقترح أقرب نطاق شائع لو النطاق المكتوب قريب جداً منه (خطأ إملائي) */
function suggestDomain(domain: string): string | null {
  if (COMMON_DOMAINS.includes(domain)) return null; // صحيح مسبقاً
  let best: string | null = null, bestDist = 99;
  for (const cd of COMMON_DOMAINS) {
    const dist = editDistance(domain, cd);
    if (dist < bestDist) { bestDist = dist; best = cd; }
  }
  // نقترح فقط لو التشابه عالٍ: فرق حرف-حرفين (حسب طول النطاق)
  const threshold = domain.length >= 8 ? 2 : 1;
  return best && bestDist > 0 && bestDist <= threshold ? best : null;
}

/** يرجّع: خطأ (نص) أو اقتراح تصحيح أو null (سليم) */
function checkEmail(raw: string): { error?: string; suggest?: string } {
  const email = raw.trim().toLowerCase();
  if (!email) return { error: "اكتب إيميلك" };
  if (!email.includes("@")) return { error: "الإيميل ناقص علامة @" };
  const parts = email.split("@");
  if (parts.length > 2) return { error: "الإيميل فيه أكثر من @ — تأكّد" };
  const [local, domain] = parts;
  if (!local) return { error: "اكتب اسم الإيميل قبل @" };
  if (!domain) return { error: "اكتب النطاق بعد @ (مثل gmail.com)" };
  if (!domain.includes(".")) return { error: "النطاق ناقص نقطة (مثل gmail.com)" };
  if (domain.startsWith(".") || domain.endsWith(".")) return { error: "تأكّد من موضع النقطة بالنطاق" };
  // 1) خطأ إملائي معروف (سريع)
  if (DOMAIN_FIXES[domain]) return { suggest: `${local}@${DOMAIN_FIXES[domain]}` };
  // 2) تصحيح تلقائي بالتشابه (يمسك أي خطأ قريب من نطاق شائع)
  const near = suggestDomain(domain);
  if (near) return { suggest: `${local}@${near}` };
  return {};
}

function SignedOutView() {
  const scope = useMotion();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [suggest, setSuggest] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const google = async () => {
    const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
    if (!supabaseEnabled) return setErr("دخول Google غير متاح حالياً");
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback/?next=/account/` } });
  };

  // إرسال الرمز للإيميل (تسجيل ودخول موحّد — بلا رقم ولا محافظة)
  const sendCode = async () => {
    setErr("");
    const check = checkEmail(email);
    if (check.error) return setErr(check.error);
    // اقتراح محلي سريع (خطأ إملائي معروف)؛ لو معروض والزبون ضغط ثانية = يتابع
    if (check.suggest && !suggest) { setSuggest(check.suggest); return; }
    setBusy(true);
    // فحص النطاق فعلياً (MX): هل يستقبل بريداً؟ — بحذر، لا نمنع عند فشل الفحص
    try {
      const dom = await fetch(`/api/customer/verify-domain/?email=${encodeURIComponent(email)}`)
        .then((r) => r.json()).catch(() => ({ ok: true }));
      if (!dom.ok) {
        setBusy(false);
        if (dom.suggest && !suggest) { setSuggest(dom.suggest); return; }
        // نطاق غير موجود وبلا اقتراح — لو الزبون مصرّ (ضغط ثانية) نتابع
        if (!suggest) { setErr("هذا النطاق قد لا يستقبل بريداً — تأكّد من إيميلك"); return; }
      }
    } catch { /* تعذّر الفحص — نمرّر بحذر */ }
    setSuggest("");
    try {
      const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
      if (!supabaseEnabled) { setErr("غير متاح حالياً"); setBusy(false); return; }
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) { setErr("تعذّر إرسال الرمز — تأكد من الإيميل"); setBusy(false); return; }
      setStep("otp"); setCooldown(45); setBusy(false);
    } catch { setErr("تعذّر الاتصال"); setBusy(false); }
  };

  // التحقق من الرمز — دخول مباشر (الرقم والمحافظة تُطلب عند الطلب)
  const verify = async () => {
    setErr("");
    if (code.trim().length < 6) return setErr("اكتب الرمز المكوّن من ٦ أرقام");
    setBusy(true);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const sb = supabaseBrowser();
      const { data, error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
      if (error) { setErr("الرمز غير صحيح أو منتهٍ — أعد الإرسال"); setBusy(false); return; }
      // نُسجّل حساب الإيميل (بلا رقم بعد — يُربط عند أول طلب)
      await fetch("/api/customer/register-email/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authUserId: data.user?.id, email }),
      }).catch(() => {});
      location.reload();
    } catch { setErr("تعذّر الاتصال"); setBusy(false); }
  };

  const inp = "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent";

  return (
    <div ref={scope} className="mx-auto max-w-sm px-6 pb-24 pt-28">
      <h1 className="reveal text-center text-[26px] font-bold">حسابك في خزف</h1>
      <p className="reveal mx-auto mt-2.5 max-w-xs text-center text-[13px] leading-relaxed text-muted">
        بلا كلمات سر — رمز يصلك على إيميلك ويدخّلك
      </p>

      <button onClick={google} disabled={busy}
        className="reveal mt-7 flex w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-card py-4 text-[14.5px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60">
        <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        المتابعة عبر Google
      </button>

      <div className="reveal my-5 flex items-center gap-3 text-[11px] text-muted">
        <span className="h-px flex-1 bg-line" /> أو بالإيميل <span className="h-px flex-1 bg-line" />
      </div>

      {step === "email" ? (
        <div className="reveal space-y-3">
          <input type="email" dir="ltr" value={email} onChange={(e) => { setEmail(e.target.value); setSuggest(""); setErr(""); }} placeholder="الإيميل" className={`${inp} text-end`} />
          {suggest && (
            <div className="rounded-[12px] border border-gold/50 bg-gold/8 px-4 py-3 text-center">
              <p className="text-[12.5px] text-muted">هل تقصد؟</p>
              <button onClick={() => { setEmail(suggest); setSuggest(""); }}
                dir="ltr" className="font-num mt-1 text-[14px] font-bold text-ink underline decoration-gold decoration-2 underline-offset-2">
                {suggest}
              </button>
              <p className="mt-1.5 text-[11px] text-muted">اضغط للتصحيح، أو تابع بإيميلك الحالي</p>
            </div>
          )}
          {err && <p className="rounded-[12px] bg-accent/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-accent">{err}</p>}
          <button onClick={sendCode} disabled={busy}
            className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
            {busy ? "لحظة…" : suggest ? "تابع بإيميلي الحالي" : "أرسل رمز الدخول"}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-muted">
            يصلك رمز من ٦ أرقام على إيميلك. إن لم تجده خلال دقيقة، تحقّق من مجلد <b>الرسائل المزعجة (Spam)</b> أو <b>الترويجات (Promotions)</b>.
          </p>
        </div>
      ) : (
        <div className="reveal space-y-3">
          <p className="text-center text-[13px] text-muted">
            أرسلنا رمزاً إلى<br/><b dir="ltr" className="text-ink">{email}</b>
          </p>
          <input dir="ltr" inputMode="numeric" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="______"
            className={`font-num ${inp} text-center !text-2xl tracking-[0.5em]`} />
          {err && <p className="rounded-[12px] bg-accent/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-accent">{err}</p>}
          <button onClick={verify} disabled={busy}
            className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
            {busy ? "لحظة…" : "دخول"}
          </button>
          <button onClick={cooldown > 0 ? undefined : sendCode} disabled={cooldown > 0}
            className="w-full py-2 text-[12.5px] font-semibold text-muted disabled:opacity-50">
            {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ث` : "لم يصلك الرمز؟ أعد الإرسال"}
          </button>
          <button onClick={() => { setStep("email"); setCode(""); setErr(""); }} className="w-full text-[12px] text-muted">
            تغيير الإيميل
          </button>
          <p className="text-center text-[11px] leading-relaxed text-muted">
            الرمز قد يصل إلى <b>الرسائل المزعجة (Spam)</b> أو <b>الترويجات</b> — تحقّق منها إن تأخّر.
          </p>
        </div>
      )}

      <Link href="/products/?cat=coffee" className="reveal mt-6 block text-center text-[12.5px] font-semibold text-muted">
        أو تسوّق كزائر بلا تسجيل ←
      </Link>
    </div>
  );
}

function transErr(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "لم تؤكّد إيميلك بعد — افتح رسالة التأكيد واضغط الرابط، ثم سجّل الدخول";
  if (m.includes("already")) return "هذا الإيميل مسجّل — سجّل دخول بدله";
  if (m.includes("invalid login")) return "الإيميل أو كلمة السر غير صحيحة";
  if (m.includes("password")) return "كلمة السر ضعيفة (٦ أحرف على الأقل)";
  return "صار خطأ — جرّب مرة ثانية";
}

/* ═══ إكمال الملف بعد Google (رقم + محافظة، لأول مرة) ═══ */
function LinkStep() {
  const { showToast } = useStore();
  const [phone, setPhone] = useState("");
  const [gov, setGov] = useState("");
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    if (!normalizeIqPhone(phone)) return showToast("رقم هاتف عراقي صحيح");
    if (!gov) return showToast("اختر محافظتك");
    setBusy(true);
    try {
      const r = await fetch("/api/customer/register/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, governorate: gov, name: "", fromGoogle: true }),
      });
      const d = await r.json();
      if (!r.ok) showToast(d.error ?? "تعذّر الحفظ");
      else { showToast("تم ✓"); location.reload(); }
    } catch { showToast("تعذّر الاتصال"); }
    setBusy(false);
  };
  const inp = "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent";
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 pb-20 pt-28">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok/12 text-ok">✓</div>
      <h1 className="mt-4 text-center text-[24px] font-bold">دخلت بنجاح</h1>
      <p className="mx-auto mt-3 max-w-xs text-center text-[13.5px] leading-relaxed text-muted">
        خطوة أخيرة لمرة واحدة: رقم هاتفك ومحافظتك حتى نجهّز طلباتك بسهولة.
      </p>
      <div className="mt-7 space-y-3">
        <input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11}
          placeholder="07XXXXXXXXX" className={`font-num ${inp} text-end`} />
        <select value={gov} onChange={(e) => setGov(e.target.value)} className={`appearance-none ${inp} ${gov ? "" : "text-muted"}`}>
          <option value="" disabled>اختر محافظتك</option>
          {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button onClick={complete} disabled={busy}
          className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
          {busy ? "لحظة…" : "حفظ ومتابعة"}
        </button>
        <button onClick={signOut} className="w-full py-2 text-[12.5px] font-semibold text-muted">تسجيل الخروج</button>
      </div>
    </div>
  );
}

async function signOut() {
  try {
    const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
    if (supabaseEnabled) await supabaseBrowser().auth.signOut();
    await fetch("/api/customer/logout/", { method: "POST" }).catch(() => {});
  } catch {}
  location.href = "/account/";
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
