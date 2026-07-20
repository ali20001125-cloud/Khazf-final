"use client";
/** رفع عدة صور من الجهاز — تُخزّن كلها بحقل مخفي (JSON)، مع حذف أي صورة */
import { useRef, useState } from "react";

export default function MultiImageUpload({ name, initial }: { name: string; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (files: FileList) => {
    setBusy(true); setErr("");
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const r = await fetch("/api/admin/upload/", { method: "POST", body: fd });
        const d = await r.json();
        if (!r.ok) { setErr(d.error ?? "فشل الرفع"); break; }
        setUrls((u) => [...u, d.url]);
      } catch { setErr("تعذّر الاتصال"); break; }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = (i: number) => setUrls((u) => u.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => setUrls((u) => {
    const j = i + dir;
    if (j < 0 || j >= u.length) return u;
    const c = [...u]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="flex flex-wrap gap-2.5">
        {urls.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-[12px] border border-line bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute inset-x-0 top-0 bg-olive/85 py-0.5 text-center text-[8px] font-bold text-olive-text">الرئيسية</span>}
            <button type="button" onClick={() => remove(i)}
              className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">×</button>
            <div className="absolute bottom-0.5 start-0.5 flex gap-0.5">
              {i > 0 && <button type="button" onClick={() => move(i, -1)} className="flex h-4 w-4 items-center justify-center rounded bg-ink/70 text-[9px] text-white">‹</button>}
              {i < urls.length - 1 && <button type="button" onClick={() => move(i, 1)} className="flex h-4 w-4 items-center justify-center rounded bg-ink/70 text-[9px] text-white">›</button>}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="flex h-20 w-20 flex-col items-center justify-center rounded-[12px] border border-dashed border-line text-[11px] font-bold text-muted disabled:opacity-50">
          {busy ? "…" : <>+<span className="mt-0.5 text-[9px]">صور</span></>}
        </button>
      </div>
      {err && <p className="mt-1.5 text-[11px] font-bold text-accent">{err}</p>}
      <p className="mt-2 text-[10.5px] text-muted">الأولى = الصورة الرئيسية · اسحب بالأسهم لإعادة الترتيب · × للحذف · الأفضل مربّعة 1000×1000</p>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden
        onChange={(e) => e.target.files?.length && pick(e.target.files)} />
    </div>
  );
}
