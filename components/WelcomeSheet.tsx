"use client";
/** دعوة تسجيل — مختصرة، وسط الشاشة، تظهر بعد تصفّح حقيقي (تمرير) لا فور الدخول */
import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/me";
import Link from "next/link";
import { X, Wallet, Gift } from "lucide-react";

export default function WelcomeSheet() {
  const [show, setShow] = useState(false);
  const [eligible, setEligible] = useState(false);

  // ١) زائر غير مسجّل ولم يُغلقها سابقاً
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        const dismissed = document.cookie.includes("khz_welcome=1");
        if (me.guest && !me.googleSession && !dismissed) setEligible(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ٢) تظهر بعد تمرير حقيقي أو بعد ٢٥ ثانية تصفّح — أيّهما أسبق
  useEffect(() => {
    if (!eligible) return;
    let done = false;
    const onScroll = () => {
      if (!done && window.scrollY > window.innerHeight * 0.6) { done = true; setShow(true); cleanup(); }
    };
    const timer = window.setTimeout(() => { if (!done) { done = true; setShow(true); cleanup(); } }, 25000);
    function cleanup() {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [eligible]);

  const close = () => {
    document.cookie = "khz_welcome=1; max-age=2592000; path=/"; // ٣٠ يوماً
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 w-full max-w-[340px] animate-[popIn_.35s_cubic-bezier(.16,1,.3,1)] rounded-[24px] border border-line bg-bg p-6 text-center shadow-2xl">
        <button onClick={close} aria-label="إغلاق"
          className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-bg-alt">
          <X size={16} />
        </button>

        <h2 className="text-[21px] font-bold leading-snug">سجّل واحصل على أكثر من قهوة</h2>

        <div className="mt-4 space-y-2.5 text-start">
          <div className="flex items-center gap-2.5">
            <Wallet size={17} className="shrink-0 text-gold" />
            <p className="text-[13px]">٣٪ كاش باك يعود إليك مع كل طلب</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Gift size={17} className="shrink-0 text-gold" />
            <p className="text-[13px]">رحلة من ستّ طلبات تنتهي بكيس مجاني</p>
          </div>
        </div>

        <Link href="/account/" onClick={close}
          className="btn btn-clay mt-5 flex w-full items-center justify-center !py-3 text-[14px]">
          أنشئ حسابك
        </Link>
        <button onClick={close} className="mt-1.5 w-full py-1.5 text-[12px] font-semibold text-muted">
          لاحقاً
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}
