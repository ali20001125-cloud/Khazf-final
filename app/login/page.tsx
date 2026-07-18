"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { supabaseBrowser, supabaseEnabled } from "@/lib/supabase-browser";
import { useMotion } from "@/lib/motion";

export default function LoginPage() {
  const scope = useMotion();
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback/?next=/account/` },
    });
  };

  return (
    <div ref={scope} className="mx-auto flex max-w-sm flex-col px-4 pb-24 pt-36">
      <h1 className="reveal text-center text-3xl font-bold">حسابك في خزف</h1>
      <p className="reveal mt-3 text-center text-[13.5px] leading-relaxed text-muted">
        هويتك عندنا برقم هاتفك — بلا كلمات مرور. أول طلب يفتح حسابك تلقائياً على هذا الجهاز.
      </p>

      <div className="reveal mt-9 space-y-3">
        {supabaseEnabled ? (
          <button onClick={google} disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-line bg-card py-4 text-[14px] font-bold transition-all hover:-translate-y-0.5 hover:border-muted active:scale-[0.98] disabled:opacity-60">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {busy ? "لحظة…" : "المتابعة عبر Google"}
          </button>
        ) : (
          <div className="rounded-[16px] border border-dashed border-line p-5 text-center text-[12.5px] leading-relaxed text-muted">
            دخول Google يتفعّل تلقائياً عند النشر (بعد ضبط مفاتيح Supabase)
          </div>
        )}

        <Link href="/products/?cat=coffee"
          className="block rounded-[16px] bg-olive py-4 text-center text-[14px] font-bold text-olive-text active:scale-[0.98]">
          متابعة كزائر — اطلب مباشرة
        </Link>
      </div>

      <div className="reveal mt-8 flex items-start gap-3 rounded-[16px] bg-bg-alt p-4 text-[12px] leading-relaxed text-muted">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ok" />
        <span>دخول Google يحفظ حسابك ونقاطك على أي جهاز — وربط رقمك القديم يحتاج رقم أي طلب سابق (إثبات ملكية).</span>
      </div>
    </div>
  );
}
