"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Package, Heart, Wallet, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { formatIQD, governorates } from "@/lib/data";
import { normalizeIqPhone } from "@/lib/phone";
import { useStore } from "@/lib/store";
import { useCatalog } from "@/lib/catalog-context";
import { useMotion } from "@/lib/motion";
import { CoffeeCard, ToolCard } from "@/components/Cards";

type JL = { level: number; rewardType: string; value: number; giftName: string | null };
type Order = { orderNumber: string; status: string; total: number; createdAt: string };
type Me = {
  guest?: boolean; googleSession?: boolean; linked?: boolean; hasAuth?: boolean;
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

      {/* ربط Google — فقط لمن ليس لديه أي حساب مصادقة (لا Google ولا إيميل) */}
      {!me.hasAuth && !me.googleSession && <ConnectGoogleHint />}

      <button onClick={signOut} className="reveal mx-auto mt-8 block text-[12.5px] font-semibold text-muted">
        تسجيل الخروج
      </button>
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
function SignedOutView() {
  const scope = useMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gov, setGov] = useState("");
  const [showPw, setShowPw] = useState(false);

  const google = async () => {
    const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
    if (!supabaseEnabled) return setErr("دخول Google غير متاح حالياً");
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback/?next=/account/` } });
  };

  const submit = async () => {
    setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("اكتب إيميلاً صحيحاً");
    if (password.length < 6) return setErr("كلمة السر ٦ أحرف على الأقل");
    if (mode === "signup") {
      if (!name.trim()) return setErr("اكتب اسمك");
      if (!normalizeIqPhone(phone)) return setErr("رقم هاتف عراقي صحيح");
      if (!gov) return setErr("اختر محافظتك");
    }
    setBusy(true);
    try {
      const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
      if (!supabaseEnabled) { setErr("غير متاح حالياً"); setBusy(false); return; }
      const sb = supabaseBrowser();
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("already")) {
            setMode("signin"); setErr("هذا الإيميل مسجّل — اكتب كلمة سرّك وسجّل دخول"); setBusy(false); return;
          }
          setErr(transErr(error.message)); setBusy(false); return;
        }
        // لو Confirm email مفعّل: ما تُنشأ جلسة — نبلّغ الزبون
        if (!data.session) {
          setMode("signin");
          setErr("أنشئنا حسابك ✓ سجّل دخول الآن بنفس الإيميل وكلمة السر");
          setBusy(false); return;
        }
        const r = await fetch("/api/customer/register/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authUserId: data.user?.id, email, name, phone, governorate: gov }),
        });
        if (!r.ok) { const d = await r.json(); setErr(d.error ?? "تعذّر الإنشاء"); setBusy(false); return; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setErr(transErr(error.message)); setBusy(false); return; }
      }
      location.reload();
    } catch { setErr("تعذّر الاتصال"); setBusy(false); }
  };

  const inp = "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent";
  return (
    <div ref={scope} className="mx-auto max-w-sm px-6 pb-24 pt-28">
      <h1 className="reveal text-center text-[26px] font-bold">{mode === "signin" ? "حسابك في خزف" : "إنشاء حساب"}</h1>
      <p className="reveal mx-auto mt-2.5 max-w-xs text-center text-[13px] leading-relaxed text-muted">
        {mode === "signin" ? "ادخل لتتابع طلباتك ونقاطك على أي جهاز" : "سجّل مرة واحدة، وتابع كل شي من أي جهاز"}
      </p>

      <button onClick={google} disabled={busy}
        className="reveal mt-7 flex w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-card py-4 text-[14.5px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60">
        <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        المتابعة عبر Google
      </button>

      <div className="reveal my-5 flex items-center gap-3 text-[11px] text-muted">
        <span className="h-px flex-1 bg-line" /> أو بالإيميل <span className="h-px flex-1 bg-line" />
      </div>

      <div className="reveal space-y-3">
        {mode === "signup" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" className={inp} />}
        <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="الإيميل" className={`${inp} text-end`} />
        <div className="relative">
          <input type={showPw ? "text" : "password"} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" className={`${inp} text-end pe-12`} />
          <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
            className="absolute inset-y-0 start-3 flex items-center text-muted" aria-label="إظهار كلمة السر">
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {mode === "signup" && (<>
          <input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11} placeholder="07XXXXXXXXX" className={`font-num ${inp} text-end`} />
          <select value={gov} onChange={(e) => setGov(e.target.value)} className={`appearance-none ${inp} ${gov ? "" : "text-muted"}`}>
            <option value="" disabled>اختر محافظتك</option>
            {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </>)}
        {err && <p className="rounded-[12px] bg-accent/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-accent">{err}</p>}
        <button onClick={submit} disabled={busy}
          className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
          {busy ? "لحظة…" : mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </button>
      </div>

      <p className="reveal mt-5 text-center text-[13px] text-muted">
        {mode === "signin" ? "ما عندك حساب؟" : "عندك حساب؟"}{" "}
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); }} className="font-bold text-accent">
          {mode === "signin" ? "أنشئ حساباً" : "سجّل دخول"}
        </button>
      </p>
      <Link href="/products/?cat=coffee" className="reveal mt-6 block text-center text-[12.5px] font-semibold text-muted">
        أو تسوّق كزائر بلا تسجيل ←
      </Link>
    </div>
  );
}

function transErr(msg: string): string {
  const m = msg.toLowerCase();
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
