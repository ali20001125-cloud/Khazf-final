"use client";

import { useState } from "react";
import { Instagram, Check } from "lucide-react";
import { useMotion } from "@/lib/motion";

const inputCls =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent";

export default function ContactPage() {
  const scope = useMotion();
  const [sent, setSent] = useState(false);

  return (
    <div ref={scope} className="mx-auto max-w-xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="reveal text-3xl font-bold md:text-4xl">تواصل معنا</h1>
      <p className="reveal mt-3 text-[14px] leading-loose text-muted">
        سؤال، اقتراح، أو طلب جملة؟ اكتب لنا ونرد خلال ساعات العمل.
      </p>

      {sent ? (
        <div className="reveal mt-10 rounded-[22px] border border-line bg-card p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok text-olive-text">
            <Check size={24} strokeWidth={3} />
          </div>
          <h2 className="mt-5 text-xl font-bold">وصلتنا رسالتك</h2>
          <p className="mt-2 text-sm text-muted">نرد عليك بأقرب وقت — شكراً لتواصلك</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); setSent(true); }}
          className="reveal mt-8 space-y-3"
        >
          <input required placeholder="الاسم" className={inputCls} />
          <input required type="tel" dir="ltr" placeholder="07XX XXX XXXX" className={`${inputCls} text-end`} />
          <textarea required rows={5} placeholder="رسالتك…" className={inputCls} />
          <button type="submit" className="btn btn-olive w-full !py-4 text-[15px] active:scale-[0.98]">أرسل</button>
        </form>
      )}

      <a
        href="https://instagram.com/khazf.roaster"
        target="_blank"
        rel="noopener noreferrer"
        className="reveal mt-8 flex items-center justify-center gap-2 rounded-[16px] border border-line py-4 text-[13px] font-bold text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <Instagram size={16} /> أو راسلنا مباشرة: khazf.roaster
      </a>
    </div>
  );
}
