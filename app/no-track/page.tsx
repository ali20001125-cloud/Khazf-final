"use client";
/** صفحة استثناء الجهاز — افتحها مرة على أي جهاز اختبار فلا تُسجَّل زياراته */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";

const KEY = "khz_no_track";

export default function NoTrackPage() {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    setOn(document.cookie.includes(`${KEY}=1`));
  }, []);

  const enable = () => {
    // سنتان
    document.cookie = `${KEY}=1; max-age=63072000; path=/; sameSite=lax`;
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOn(true);
  };
  const disable = () => {
    document.cookie = `${KEY}=; max-age=0; path=/`;
    try { localStorage.removeItem(KEY); } catch {}
    setOn(false);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-32">
      <h1 className="text-[24px] font-bold">استثناء هذا الجهاز</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
        عند التفعيل لا تُسجَّل زيارات هذا الجهاز في التحليلات، ولا تُرسل أحداثه إلى Meta Pixel وGoogle Analytics —
        فلا تفسد اختباراتك بيانات الإعلانات.
      </p>

      <div className={`mt-6 flex items-center gap-3 rounded-[16px] border p-4 ${
        on ? "border-ok/40 bg-ok/8" : "border-line bg-card"
      }`}>
        {on ? <Check size={18} className="text-ok" /> : <X size={18} className="text-muted" />}
        <p className="text-[14px] font-bold">
          {on === null ? "…" : on ? "هذا الجهاز مستثنى" : "هذا الجهاز يُسجَّل حالياً"}
        </p>
      </div>

      <div className="mt-5 flex gap-2.5">
        <button onClick={enable} disabled={on === true}
          className="btn btn-clay flex-1 !py-3 text-[14px] disabled:opacity-40">
          فعّل الاستثناء
        </button>
        <button onClick={disable} disabled={on === false}
          className="flex-1 rounded-[13px] border border-line py-3 text-[14px] font-bold disabled:opacity-40">
          ألغِ
        </button>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-muted">
        يبقى الاستثناء سنتين على هذا المتصفّح. كرّره على كل جهاز أو متصفّح تختبر منه.
      </p>
      <Link href="/" className="mt-4 inline-block text-[13px] font-bold text-accent">← الرئيسية</Link>
    </div>
  );
}
