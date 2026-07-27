"use client";
/** رفع صورة من الجهاز — يملأ حقلاً مخفياً بالرابط الناتج */
import { useRef, useState } from "react";

export default function ImageUpload({ name, initial }: { name: string; initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
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
      else setUrl(d.url);
    } catch { setErr("تعذّر الاتصال"); }
    setBusy(false);
  };

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-14 w-14 rounded-[12px] border border-line object-contain bg-card" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-[12px] border border-dashed border-line text-[10px] text-muted">لا صورة</span>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="rounded-[10px] bg-bg-alt px-4 py-2.5 text-[12.5px] font-bold disabled:opacity-50">
          {busy ? "جارٍ الرفع…" : url ? "تغيير الصورة" : "رفع من الجهاز"}
        </button>
        {url && <button type="button" onClick={() => setUrl("")} className="text-[12px] font-bold text-accent">إزالة</button>}
      </div>
      {err && <p className="mt-1.5 text-[11px] font-bold text-accent">{err}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
    </div>
  );
}
