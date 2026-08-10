"use client";
/** ترتيب المحاصيل بالسحب — الترتيب هنا هو ترتيب الرئيسية والمتجر */
import { useState } from "react";
import { GripVertical, Check } from "lucide-react";
import { reorderProducts, setProductTag } from "@/app/alikhazf25/(panel)/products/actions";

type Row = { id: number; name: string; slug: string; tag: string | null; active: boolean };

export default function CropOrder({ rows }: { rows: Row[] }) {
  const [list, setList] = useState(rows);
  const [drag, setDrag] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...list];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setList(next);
  };

  const save = async () => {
    setBusy(true);
    await reorderProducts(list.map((r) => r.id));
    setBusy(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex flex-col gap-px bg-line">
        {list.map((r, i) => (
          <div
            key={r.id}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { move(drag, i); setDrag(i); } }}
            onDragEnd={() => setDrag(null)}
            className={`flex items-center gap-3 bg-bg p-3 transition-opacity ${drag === i ? "opacity-50" : ""}`}
          >
            <GripVertical size={16} className="shrink-0 cursor-grab text-muted active:cursor-grabbing" />
            <span className="font-num w-5 shrink-0 text-[11px] text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">
              {r.name}
              {!r.active && <span className="ms-2 text-[11px] font-normal text-muted">(مخفي)</span>}
            </span>

            <form action={setProductTag} className="flex shrink-0 items-center gap-1.5">
              <input type="hidden" name="id" value={r.id} />
              <input name="tag" defaultValue={r.tag ?? ""} placeholder="وسم"
                className="w-[86px] rounded-[4px] border border-line bg-bg-alt px-2 py-1.5 text-[12px] outline-none focus:border-accent" />
              <button className="rounded-[4px] border border-line px-2 py-1.5 text-[11px] font-bold text-muted hover:text-ink">
                حفظ
              </button>
            </form>

            {/* أزرار بديلة للهاتف */}
            <div className="flex shrink-0 flex-col gap-0.5">
              <button onClick={() => move(i, Math.max(0, i - 1))} disabled={i === 0}
                aria-label="لأعلى" className="px-1.5 text-[11px] text-muted disabled:opacity-25">▲</button>
              <button onClick={() => move(i, Math.min(list.length - 1, i + 1))} disabled={i === list.length - 1}
                aria-label="لأسفل" className="px-1.5 text-[11px] text-muted disabled:opacity-25">▼</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={save} disabled={busy}
        className="mt-3 flex min-h-[42px] items-center gap-2 rounded-[4px] bg-olive px-5 text-[13px] font-bold text-olive-text disabled:opacity-50">
        {saved ? <><Check size={15} /> حُفظ الترتيب</> : busy ? "جارٍ الحفظ…" : "احفظ الترتيب"}
      </button>
      <p className="mt-2 text-[11.5px] text-muted">
        هذا الترتيب يُطبَّق على الرئيسية والمتجر · والأكثر مبيعاً يتصدّر دائماً
      </p>
    </div>
  );
}
