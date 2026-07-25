"use client";
/** قائمة ترحيب — تظهر مرة للزائر غير المسجّل، تشرح فوائد التسجيل، قابلة للإغلاق */
import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Wallet, Truck, Gift, Sparkles } from "lucide-react";

const BENEFITS = [
  { Icon: Wallet, t: "كاش باك على كل طلب", d: "رصيد يتراكم ويُخصم من طلباتك القادمة" },
  { Icon: Gift, t: "رحلة مكافآت", d: "توت باج، خصومات، وهدايا تكبر مع كل طلب" },
  { Icon: Truck, t: "توصيل مجّاني", d: "عند وصول طلبك للحدّ، أو عبر رحلة الولاء" },
  { Icon: Sparkles, t: "تتبّع طلباتك", d: "من أي جهاز، بضغطة عبر Google" },
];

export default function WelcomeSheet() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // نتحقق: زائر غير مسجّل ولم يُغلق القائمة سابقاً (بهذه الجلسة عبر الحالة، لا تخزين)
    let cancelled = false;
    fetch("/api/customer/me")
      .then((r) => r.json())
      .then((me) => {
        if (cancelled) return;
        const dismissed = document.cookie.includes("khz_welcome=1");
        if (me.guest && !me.googleSession && !dismissed) {
          setTimeout(() => setShow(true), 1400); // بعد لحظة من الدخول
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const close = () => {
    document.cookie = "khz_welcome=1; max-age=2592000; path=/"; // 30 يوم
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 w-full max-w-md animate-[slideUp_.4s_cubic-bezier(.16,1,.3,1)] rounded-t-[28px] border border-line bg-bg p-6 sm:rounded-[28px] sm:m-4">
        <button onClick={close} aria-label="إغلاق" className="absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-bg-alt">
          <X size={18} />
        </button>
        <p className="font-num text-[10px] tracking-[0.4em] text-accent">KHAZF REWARDS</p>
        <h2 className="mt-2 text-[24px] font-bold leading-tight">سجّل واحصل على أكثر من قهوة</h2>
        <p className="mt-1.5 text-[13px] text-muted">حساب مجّاني يفتح لك مكافآت تكبر مع كل طلب</p>

        <div className="mt-5 space-y-3">
          {BENEFITS.map(({ Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent/10 text-accent">
                <Icon size={19} />
              </div>
              <div>
                <p className="text-[14px] font-bold">{t}</p>
                <p className="text-[12px] leading-relaxed text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <Link href="/account/" onClick={close} className="btn btn-clay mt-6 flex w-full items-center justify-center !py-3.5 text-[14.5px]">
          أنشئ حسابك المجّاني
        </Link>
        <button onClick={close} className="mt-2 w-full py-2 text-[12.5px] font-semibold text-muted">
          لاحقاً — تصفّح المتجر
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
