"use client";
/** جمع البريد — دليل التحضير أو إشعار عودة منتج نفد */
import { useState } from "react";
import { Mail, Check, Bell } from "lucide-react";
import { checkEmail } from "@/lib/email-check";

type Props = {
  source?: "guide" | "restock" | "footer";
  productSlug?: string;
  productName?: string;
  compact?: boolean;
};

export default function LeadCapture({ source = "guide", productSlug, productName, compact }: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const check = checkEmail(email);
    if (check.error) { setErr(check.error); return; }
    if (check.suggest) { setErr(`هل تقصد ${check.suggest}؟`); setEmail(check.suggest); return; }
    setErr(null);
    setState("sending");
    try {
      const r = await fetch("/api/lead/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, productSlug }),
      });
      if (!r.ok) throw new Error();
      setState("done");
    } catch {
      setErr("تعذّر التسجيل — حاول ثانية");
      setState("idle");
    }
  };

  const isRestock = source === "restock";

  if (state === "done") {
    return (
      <div className={`flex items-center gap-2.5 rounded-[14px] bg-ok/10 px-4 py-3 text-[13px] font-bold text-ok ${compact ? "" : "justify-center"}`}>
        <Check size={16} />
        {isRestock ? "سنُعلمك أول ما يعود" : "أرسلنا الدليل إلى بريدك"}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-[20px] border border-line bg-card p-5"}>
      {!compact && (
        <>
          <div className="flex items-center gap-2 text-accent">
            {isRestock ? <Bell size={17} /> : <Mail size={17} />}
            <p className="text-[12px] font-bold tracking-wide">
              {isRestock ? "نبّهني" : "دليل التحضير"}
            </p>
          </div>
          <h3 className="mt-2 text-[17px] font-bold leading-snug">
            {isRestock
              ? `${productName ?? "هذا المحصول"} نفد مؤقتاً`
              : "نِسب التحضير التي نعتمدها في خزف"}
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {isRestock
              ? "اترك بريدك ونُعلمك أول ما يعود — قبل أن ينفد ثانية"
              : "V60 · فرنش برس · إسبريسو — بالجرامات والوقت ودرجة الماء"}
          </p>
        </>
      )}

      <div className="mt-3.5 flex gap-2">
        <input
          type="email" inputMode="email" dir="ltr"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="بريدك الإلكتروني"
          className="font-num min-w-0 flex-1 rounded-[12px] border border-line bg-bg px-3.5 py-2.5 text-[13px] outline-none focus:border-accent"
        />
        <button onClick={submit} disabled={state === "sending"}
          className="btn btn-clay shrink-0 !px-5 !py-2.5 text-[13px] active:scale-[0.97] disabled:opacity-60">
          {state === "sending" ? "…" : isRestock ? "نبّهني" : "أرسله لي"}
        </button>
      </div>

      {err && <p className="mt-2 text-[11.5px] font-bold text-accent">{err}</p>}
      {!compact && (
        <p className="mt-2 text-[11px] text-muted">بلا رسائل مزعجة — فقط ما يستحق.</p>
      )}
    </div>
  );
}
