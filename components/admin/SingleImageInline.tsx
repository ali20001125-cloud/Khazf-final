"use client";
/** رفع صورة واحدة inline — يرجّع الرابط عبر onChange (للمحرّرات الديناميكية) */
import { useRef, useState } from "react";

export default function SingleImageInline({
  label, value, onChange,
}: { label: string; value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (f: File) => {
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/admin/upload/", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "فشل الرفع");
      else onChange(d.url);
    } catch { setErr("تعذّر الاتصال"); }
    setBusy(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2.5">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-11 w-11 rounded-[10px] border border-line bg-bg object-contain" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed border-line text-[9px] text-muted">لا صورة</span>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="rounded-[9px] bg-bg-alt px-3 py-2 text-[11.5px] font-bold disabled:opacity-50">
          {busy ? "جارٍ…" : value ? "تغيير" : label}
        </button>
        {value && <button type="button" onClick={() => onChange("")} className="text-[11px] font-bold text-accent">إزالة</button>}
      </div>
      {err && <p className="mt-1 text-[10.5px] font-bold text-accent">{err}</p>}
    </div>
  );
}
