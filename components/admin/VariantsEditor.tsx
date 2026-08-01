"use client";
/** محرّر خيارات المنتج — لكل خيار: اسم، سعر، سعر عرض، تكلفة، مخزون، صورة */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { inputCls } from "@/components/admin/ui";
import SingleImageInline from "@/components/admin/SingleImageInline";

export type VariantRow = {
  id?: number;
  label: string;
  kind: "SIZE" | "COLOR" | "PACK";
  price?: number | string | null;
  salePrice?: number | string | null;
  costPrice?: number | string | null;
  stock: number | string;
  hex?: string | null;      // درجة اللون (منتقي) — للخيارات من نوع لون
  image?: string | null;
  active?: boolean;
};

const digits = (v: unknown) => String(v ?? "").replace(/[^0-9]/g, "");
const withCommas = (v: unknown) => {
  const d = digits(v);
  return d ? Number(d).toLocaleString("en") : "";
};

const empty = (): VariantRow => ({ label: "", kind: "SIZE", price: "", salePrice: "", costPrice: "", stock: 0, hex: "", image: "", active: true });

export default function VariantsEditor({ initial }: { initial?: VariantRow[] | null }) {
  const [rows, setRows] = useState<VariantRow[]>(initial?.length ? initial : []);

  const upd = (i: number, patch: Partial<VariantRow>) =>
    setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-3">
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />

      {rows.length > 0 && (
        <p className="rounded-[12px] bg-gold/10 px-4 py-3 text-[12.5px] font-bold leading-relaxed text-ink">
          ما دامت هناك خيارات، النظام يعتمد <span className="text-accent">سعر ومخزون كل خيار</span> فقط —
          ويتجاهل «سعر القطعة» و«المخزون» في الأعلى.
          <br />
          <span className="font-normal text-muted">
            المخزون الكلي = مجموع الخيارات
            {(() => {
              const total = rows.reduce((t, r) => t + (Number(String(r.stock).replace(/[^0-9]/g, "")) || 0), 0);
              return total > 0 ? ` (حالياً ${total.toLocaleString("en")} قطعة)` : " — لم تُدخل الكميات بعد";
            })()}
          </span>
        </p>
      )}

      {rows.length === 0 && (
        <p className="rounded-[12px] bg-bg-alt px-4 py-3 text-[12.5px] leading-relaxed text-muted">
          بلا خيارات — يُستخدم سعر القطعة ومخزونها من الأعلى.
          <br />أضف خيارات إن كان للمنتج أحجام (V01 / V02) أو عبوات (٥٠ / ١٠٠ فلتر) أو ألوان بأسعار أو مخزون مختلف.
        </p>
      )}

      {rows.map((v, i) => (
        <div key={i} className="rounded-[14px] border border-line bg-bg p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-bold text-muted">الخيار {i + 1}</span>
            <button type="button" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
              className="flex items-center gap-1 text-[12px] font-bold text-accent">
              <Trash2 size={13} /> حذف
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">الاسم <span className="font-normal">(اختياري للألوان)</span></label>
              <input value={v.label} onChange={(e) => upd(i, { label: e.target.value })}
                placeholder="V02 · ١٠٠ فلتر · أبيض" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">النوع</label>
              <select value={v.kind} onChange={(e) => upd(i, { kind: e.target.value as VariantRow["kind"] })} className={inputCls}>
                <option value="SIZE">مقاس</option>
                <option value="PACK">عبوة/كمية</option>
                <option value="COLOR">لون</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">المخزون (قطعة)</label>
              <input value={digits(v.stock)} onChange={(e) => upd(i, { stock: digits(e.target.value) })}
                inputMode="numeric" placeholder="10" className={`${inputCls} font-num`} dir="ltr" />
            </div>

            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">السعر <span className="font-normal">(فارغ = السعر العام)</span></label>
              <input value={withCommas(v.price)} onChange={(e) => upd(i, { price: digits(e.target.value) })}
                inputMode="numeric" placeholder="السعر العام" className={`${inputCls} font-num`} dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">سعر العرض <span className="font-normal">(اختياري)</span></label>
              <input value={withCommas(v.salePrice)} onChange={(e) => upd(i, { salePrice: digits(e.target.value) })}
                inputMode="numeric" placeholder="أقل من السعر" className={`${inputCls} font-num`} dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-bold text-muted">التكلفة <span className="font-normal">(للربح)</span></label>
              <input value={withCommas(v.costPrice)} onChange={(e) => upd(i, { costPrice: digits(e.target.value) })}
                inputMode="numeric" placeholder="التكلفة" className={`${inputCls} font-num`} dir="ltr" />
            </div>

            {v.kind === "COLOR" && (
              <>
                <div>
                  <label className="mb-1 block text-[11.5px] font-bold text-muted">
                    درجة اللون <span className="font-normal">(اختر بدل الكتابة)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={v.hex || "#cccccc"}
                      onChange={(e) => upd(i, { hex: e.target.value })}
                      className="h-11 w-14 shrink-0 cursor-pointer rounded-[10px] border border-line bg-bg p-1" />
                    <input value={v.hex ?? ""} onChange={(e) => upd(i, { hex: e.target.value })}
                      placeholder="#C9A15A" className={`${inputCls} font-num`} dir="ltr" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11.5px] font-bold text-muted">صورة اللون <span className="font-normal">(اختياري)</span></label>
                  <SingleImageInline label="صورة اللون" value={v.image ?? ""} onChange={(url) => upd(i, { image: url })} />
                </div>
              </>
            )}

            <label className="flex items-center gap-2 text-[12.5px] font-bold sm:col-span-3">
              <input type="checkbox" checked={v.active !== false}
                onChange={(e) => upd(i, { active: e.target.checked })} className="h-4 w-4 accent-[#505445]" />
              متاح للبيع
            </label>
          </div>
        </div>
      ))}

      <button type="button" onClick={() => setRows((r) => [...r, empty()])}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-line py-3 text-[13px] font-bold text-muted hover:border-muted hover:text-ink">
        <Plus size={15} /> إضافة خيار
      </button>
    </div>
  );
}
