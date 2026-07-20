"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { governorates } from "@/lib/data";
import { useMotion } from "@/lib/motion";

export default function LoginPage() {
  return <Suspense><AuthInner /></Suspense>;
}

type Mode = "signin" | "signup";

function AuthInner() {
  const scope = useMotion();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // حقول
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");

  const google = async () => {
    const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
    if (!supabaseEnabled) { setErr("دخول Google غير متاح حالياً"); return; }
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
      if (!/^07\d{9}$/.test(phone)) return setErr("رقم هاتف عراقي صحيح (07XXXXXXXXX)");
      if (!governorate) return setErr("اختر محافظتك");
      if (!address.trim()) return setErr("اكتب عنوانك");
    }
    setBusy(true);
    try {
      const { supabaseBrowser, supabaseEnabled } = await import("@/lib/supabase-browser");
      if (!supabaseEnabled) { setErr("التسجيل غير متاح حالياً"); setBusy(false); return; }
      const sb = supabaseBrowser();

      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) { setErr(trans(error.message)); setBusy(false); return; }
        // أنشئ ملف الزبون واربطه بحساب المصادقة
        const r = await fetch("/api/customer/register/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authUserId: data.user?.id, email, name, phone, governorate, address }),
        });
        if (!r.ok) { const d = await r.json(); setErr(d.error ?? "تعذّر إنشاء الحساب"); setBusy(false); return; }
        location.href = "/account/";
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setErr(trans(error.message)); setBusy(false); return; }
        location.href = "/account/";
      }
    } catch { setErr("تعذّر الاتصال"); setBusy(false); }
  };

  return (
    <div ref={scope} className="mx-auto max-w-sm px-6 pb-24 pt-28">
      <h1 className="reveal text-center text-[26px] font-bold">
        {mode === "signin" ? "دخول حسابك" : "إنشاء حساب"}
      </h1>
      <p className="reveal mx-auto mt-2.5 max-w-xs text-center text-[13px] leading-relaxed text-muted">
        {mode === "signin" ? "ادخل لتتابع طلباتك ونقاطك" : "سجّل مرة واحدة، وتابع طلباتك ونقاطك من أي جهاز"}
      </p>

      {/* Google */}
      <button onClick={google} disabled={busy}
        className="reveal mt-7 flex w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-card py-4 text-[14.5px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60">
        <svg width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        المتابعة عبر Google
      </button>

      {/* فاصل */}
      <div className="reveal my-5 flex items-center gap-3 text-[11px] text-muted">
        <span className="h-px flex-1 bg-line" /> أو بالإيميل <span className="h-px flex-1 bg-line" />
      </div>

      {/* نموذج الإيميل */}
      <div className="reveal space-y-3">
        {mode === "signup" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل"
            className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent" />
        )}
        <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="الإيميل"
          className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-[14px] outline-none focus:border-accent" />
        <input type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر"
          className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-[14px] outline-none focus:border-accent" />

        {mode === "signup" && (
          <>
            <input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={11}
              placeholder="07XXXXXXXXX" className="font-num w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-[14px] outline-none focus:border-accent" />
            <div className="relative">
              <select value={governorate} onChange={(e) => setGovernorate(e.target.value)}
                className={`w-full appearance-none rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent ${governorate ? "" : "text-muted"}`}>
                <option value="" disabled>اختر محافظتك</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان: المنطقة، أقرب نقطة دالة"
              className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-[14px] outline-none focus:border-accent" />
          </>
        )}

        {err && <p className="rounded-[12px] bg-accent/10 px-4 py-2.5 text-center text-[12.5px] font-bold text-accent">{err}</p>}

        <button onClick={submit} disabled={busy}
          className="w-full rounded-[14px] bg-olive py-4 text-[14.5px] font-bold text-olive-text active:scale-[0.98] disabled:opacity-60">
          {busy ? "لحظة…" : mode === "signin" ? "دخول" : "إنشاء الحساب"}
        </button>
      </div>

      {/* تبديل */}
      <p className="reveal mt-5 text-center text-[13px] text-muted">
        {mode === "signin" ? "ما عندك حساب؟" : "عندك حساب؟"}{" "}
        <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(""); }}
          className="font-bold text-accent">
          {mode === "signin" ? "أنشئ حساباً" : "سجّل دخول"}
        </button>
      </p>

      <Link href="/products/?cat=coffee" className="reveal mt-6 block text-center text-[12.5px] font-semibold text-muted">
        أو تسوّق كزائر بلا تسجيل ←
      </Link>
    </div>
  );
}

function trans(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been")) return "هذا الإيميل مسجّل — سجّل دخول بدله";
  if (m.includes("invalid login")) return "الإيميل أو كلمة السر غير صحيحة";
  if (m.includes("password")) return "كلمة السر ضعيفة (٦ أحرف على الأقل)";
  if (m.includes("email")) return "تحقق من إيميلك";
  return "صار خطأ — جرّب مرة ثانية";
}
