"use client";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";

/** زر واتساب عائم — رقم خزف الرسمي */
const WA = "9647881554987"; // 07881554987
const SEEN = "khz_wa_bubble";

export default function WhatsAppFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* تنبثق مرة واحدة بعد ٣٠ ثانية — ولا تعود إن أُغلقت */
  useEffect(() => {
    try { if (sessionStorage.getItem(SEEN)) return; } catch { return; }
    if (pathname?.startsWith("/cart") || pathname?.startsWith("/checkout")) return;
    const t = window.setTimeout(() => setOpen(true), 30_000);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const dismiss = () => {
    setOpen(false);
    try { sessionStorage.setItem(SEEN, "1"); } catch { /* تجاهل */ }
  };

  const goFinder = () => {
    dismiss();
    document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-[84px] end-4 z-30 w-[248px] rounded-[16px] border border-line bg-bg p-4 shadow-xl shadow-black/12 md:bottom-[76px]">
          <button onClick={dismiss} aria-label="إغلاق"
            className="absolute start-2.5 top-2.5 text-muted transition-colors hover:text-ink">
            <X size={15} />
          </button>
          <p className="pe-4 text-[13.5px] font-bold leading-snug">محتار بالاختيار؟</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">نساعدك تختار ما يناسب ذوقك</p>
          <div className="mt-3 flex flex-col gap-2">
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" onClick={dismiss}
              className="flex min-h-[38px] items-center justify-center rounded-[10px] bg-[#25D366] text-[12.5px] font-bold text-white">
              راسلنا واتساب
            </a>
            <button onClick={goFinder}
              className="flex min-h-[38px] items-center justify-center rounded-[10px] border border-line text-[12.5px] font-bold text-ink">
              رشّح لي محصولاً
            </button>
          </div>
        </div>
      )}

      <a
        href={`https://wa.me/${WA}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="تواصل عبر واتساب"
        className="fixed bottom-24 end-4 z-30 flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        style={{ height: 48, width: 48 }}
      >
        <MessageCircle size={24} fill="white" strokeWidth={0} />
      </a>
    </>
  );
}
