"use client";

import { useState } from "react";
import { Instagram, Check } from "lucide-react";
import { useMotion } from "@/lib/motion";

const inputCls =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent";

export default function ContactPage() {
  const scope = useMotion();
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true); setErr(null);
            try {
              const r = await fetch("/api/contact/", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, contact, message }),
              });
              if (!r.ok) throw new Error();
              setSent(true);
            } catch {
              setErr("تعذّر الإرسال — راسلنا على إنستغرام أو واتساب");
            } finally { setBusy(false); }
          }}
          className="mt-8 space-y-3"
        >
          <input required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="الاسم" className={inputCls} />
          <input required type="tel" dir="ltr" value={contact} onChange={(e) => setContact(e.target.value)}
            placeholder="07XX XXX XXXX" className={`${inputCls} text-end`} />
          <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="رسالتك…" className={inputCls} />
          {err && <p className="text-[12.5px] font-bold text-accent">{err}</p>}
          <button type="submit" disabled={busy}
            className="btn btn-olive w-full !py-4 text-[15px] active:scale-[0.98] disabled:opacity-50">
            {busy ? "جارٍ الإرسال…" : "أرسل"}
          </button>
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
