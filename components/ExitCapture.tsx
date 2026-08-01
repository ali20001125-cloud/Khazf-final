"use client";
/** بطاقة تظهر عند نيّة المغادرة — تلتقط بريد من كان سيخرج بلا شراء */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import LeadCapture from "@/components/LeadCapture";
import { useStore } from "@/lib/store";

const KEY = "khz_exit_seen";

export default function ExitCapture() {
  const [show, setShow] = useState(false);
  const { cart } = useStore();

  useEffect(() => {
    // لا نزعج من سبق أن رآها، ولا من بدأ الشراء فعلاً
    try { if (localStorage.getItem(KEY) === "1") return; } catch {}
    if (cart.length > 0) return;

    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      setShow(true);
      try { localStorage.setItem(KEY, "1"); } catch {}
      cleanup();
    };

    // سطح المكتب: المؤشّر يغادر نحو الأعلى
    const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) fire(); };
    // الهاتف: تمرير طويل ثم رجوع للأعلى بسرعة (نيّة مغادرة)
    let maxScroll = 0;
    const onScroll = () => {
      const y = window.scrollY;
      maxScroll = Math.max(maxScroll, y);
      if (maxScroll > window.innerHeight * 2 && y < maxScroll - window.innerHeight * 1.2) fire();
    };

    function cleanup() {
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    }

    // تأخير قصير حتى لا تظهر لمن دخل للتوّ
    const t = window.setTimeout(() => {
      document.addEventListener("mouseleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }, 12000);

    return () => { window.clearTimeout(t); cleanup(); };
  }, [cart.length]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-5" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-sm" onClick={() => setShow(false)} />
      <div className="relative z-10 w-full max-w-[360px] animate-[popIn_.35s_cubic-bezier(.16,1,.3,1)] rounded-[24px] border border-line bg-bg p-6 shadow-2xl">
        <button onClick={() => setShow(false)} aria-label="إغلاق"
          className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-bg-alt">
          <X size={16} />
        </button>

        <h2 className="text-[20px] font-bold leading-snug">قبل أن تذهب</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          خذ معك دليل التحضير — النِّسب والخطوات التي نعتمدها في خزف، على بريدك مجاناً.
        </p>

        <div className="mt-4">
          <LeadCapture source="guide" compact />
        </div>

        <button onClick={() => setShow(false)}
          className="mt-2 w-full py-1.5 text-[12px] font-semibold text-muted">
          لا شكراً
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}
