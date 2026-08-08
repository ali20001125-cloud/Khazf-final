"use client";
/** زر واتساب برسالة طلب جاهزة — ينسخها أو يفتح المحادثة مباشرة */
import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";

type Item = { name: string; qty: number; line: number };

export default function WhatsAppOrder({
  phone, name, orderNumber, items, total, governorate, address, status,
}: {
  phone: string; name: string; orderNumber: string;
  items: Item[]; total: number;
  governorate?: string | null; address?: string | null; status?: string;
}) {
  const [copied, setCopied] = useState(false);

  const m = (n: number) => Number(n ?? 0).toLocaleString("en");
  const intl = "964" + String(phone ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "").replace(/^964/, "");

  /* موعد الوصول: يوم إلى يومين من اليوم */
  const fmt = (d: Date) => d.toLocaleDateString("ar-IQ", { weekday: "long", day: "numeric", month: "long" });
  const d1 = new Date(Date.now() + 864e5);
  const d2 = new Date(Date.now() + 2 * 864e5);

  const lines = items.map((i) => `• ${i.name} ×${i.qty} — ${m(i.line)} د.ع`).join("\n");

  const msg =
`مرحباً ${name} 🤎

وصلنا طلبك من خزف وجارٍ تجهيزه.

رقم الطلب: ${orderNumber}

${lines}

الإجمالي: ${m(total)} د.ع
${governorate ? `التوصيل إلى: ${governorate}${address ? ` — ${address}` : ""}` : ""}

المتوقّع وصوله بين ${fmt(d1)} و${fmt(d2)}، والدفع عند الاستلام.

لتتبّع طلبك من khazf.shop تحتاج رقم الطلب ${orderNumber} ورقم هاتفك.

نرجو فحص الطلب أمام المندوب قبل الدفع.
وإن احتجت أي تعديل أو استفسار، راسلنا هنا مباشرة.

خزف · قهوة مختصة`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* تجاهل */ }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`}
        target="_blank" rel="noopener"
        className="flex items-center gap-2 rounded-[11px] bg-[#25D366] px-4 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95"
      >
        <MessageCircle size={15} /> أرسل رسالة الطلب
      </a>
      <button onClick={copy}
        className="flex items-center gap-2 rounded-[11px] border border-line px-4 py-2.5 text-[13px] font-bold text-muted transition-colors hover:text-ink">
        {copied ? <><Check size={15} className="text-ok" /> نُسخت</> : <><Copy size={15} /> انسخ النص</>}
      </button>
      <span className="font-num text-[11.5px] text-muted" dir="ltr">+{intl}</span>
    </div>
  );
}
