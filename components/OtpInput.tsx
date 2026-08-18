"use client";

/* حقل رمز الدخول — ست خانات منفصلة، انتقال تلقائي ولصق دفعة واحدة */

import { useEffect, useRef, useState } from "react";

const LEN = 6;

export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
}) {
  const [cells, setCells] = useState<string[]>(Array(LEN).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // إعادة الضبط عندما يُفرَّغ الرمز من الأعلى (تغيير الإيميل / إعادة الإرسال)
  useEffect(() => {
    if (value === "") setCells(Array(LEN).fill(""));
  }, [value]);

  const push = (next: string[]) => {
    setCells(next);
    const joined = next.join("");
    onChange(joined);
    if (joined.length === LEN && !next.includes("")) onComplete?.(joined);
  };

  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      const next = [...cells];
      next[i] = "";
      push(next);
      return;
    }
    const next = [...cells];
    // لصق أو كتابة سريعة: وزّع الأرقام على الخانات التالية
    for (let k = 0; k < digits.length && i + k < LEN; k++) next[i + k] = digits[k];
    push(next);
    focusAt(i + digits.length);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...cells];
      if (next[i]) next[i] = "";
      else if (i > 0) { next[i - 1] = ""; focusAt(i - 1); }
      push(next);
    } else if (e.key === "ArrowLeft") { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); focusAt(i + 1); }
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!digits) return;
    e.preventDefault();
    const next = Array(LEN).fill("");
    for (let k = 0; k < digits.length; k++) next[k] = digits[k];
    push(next);
    focusAt(digits.length);
  };

  return (
    <div dir="ltr" className="flex justify-center gap-2">
      {cells.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={c}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`الرقم ${i + 1} من ${LEN}`}
          className={`font-num h-[54px] w-full min-w-0 rounded-[4px] border bg-card text-center text-[21px] font-bold outline-none transition-colors disabled:opacity-60 ${
            c ? "border-accent/55 text-ink" : "border-line text-ink"
          } focus:border-accent`}
        />
      ))}
    </div>
  );
}
