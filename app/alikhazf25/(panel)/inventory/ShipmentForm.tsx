"use client";
/** نموذج الشحنة — حساب حي: المتبقي، توصيل/كغ، الأكياس */
import { useMemo, useState } from "react";
import { addShipment } from "./actions";
import { inputCls } from "@/components/admin/ui";
import SubmitBtn from "@/components/admin/SubmitBtn";

const toEn = (v: string) => v.replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c).toString());
const num = (v: string) => { const n = Number(toEn(v).trim()); return Number.isFinite(n) ? n : 0; };

export default function ShipmentForm({ coffees }: { coffees: { id: number; name: string }[] }) {
  const [totalKg, setTotalKg] = useState("");
  const [shipTotal, setShipTotal] = useState("");
  const [rows, setRows] = useState([{ product: "", kg: "", price: "" }]);

  const usedKg = useMemo(() => rows.reduce((t, r) => t + num(r.kg), 0), [rows]);
  const remaining = Math.max(0, num(totalKg) - usedKg);
  const shipPerKilo = num(totalKg) > 0 ? Math.round(num(shipTotal) / num(totalKg)) : 0;

  const set = (i: number, k: "product" | "kg" | "price", v: string) => {
    const next = rows.map((r, j) => (j === i ? { ...r, [k]: v } : r));
    if (i === rows.length - 1 && next[i].product && rows.length < 6) next.push({ product: "", kg: "", price: "" });
    setRows(next);
  };

  return (
    <form action={addShipment} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-muted">الشحنة الكلية (كغ)</span>
          <input name="totalKg" value={totalKg} onChange={(e) => setTotalKg(e.target.value)}
            inputMode="decimal" dir="ltr" placeholder="10" className={`${inputCls} font-num`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-bold text-muted">توصيل الشحنة الإجمالي</span>
          <input name="shipTotal" value={shipTotal} onChange={(e) => setShipTotal(e.target.value)}
            inputMode="numeric" dir="ltr" placeholder="100000" className={`${inputCls} font-num`} />
        </label>
      </div>

      {/* الحساب الحي */}
      <div className="flex flex-wrap gap-2 text-[11.5px] font-bold">
        <span className="rounded-full bg-bg-alt px-3 py-1.5">المتبقي للتوزيع: <b className="font-num text-accent">{remaining}</b> كغ</span>
        <span className="rounded-full bg-bg-alt px-3 py-1.5">توصيل الكيلو: <b className="font-num">{shipPerKilo.toLocaleString("en")}</b> د</span>
        <span className="rounded-full bg-bg-alt px-3 py-1.5">= <b className="font-num">{Math.round(shipPerKilo / 4).toLocaleString("en")}</b> د للكيس</span>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_76px_110px] gap-2">
            <select name={`p${i + 1}_product`} value={r.product} onChange={(e) => set(i, "product", e.target.value)} className={inputCls}>
              <option value="">{i === 0 ? "المحصول" : "+ محصول"}</option>
              {coffees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name={`p${i + 1}_kg`} value={r.kg} onChange={(e) => set(i, "kg", e.target.value)}
              inputMode="decimal" dir="ltr" placeholder={i === rows.length - 1 || !r.kg ? `${remaining || "كغ"}` : "كغ"}
              className={`${inputCls} font-num`} />
            <input name={`p${i + 1}_price`} value={r.price} onChange={(e) => set(i, "price", e.target.value)}
              inputMode="numeric" dir="ltr" placeholder="سعر/كغ" className={`${inputCls} font-num`} />
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        💡 اترك كمية آخر محصول فارغة — ياخذ المتبقي ({remaining} كغ) تلقائياً · كل كيلو = ٤ أكياس
      </p>
      <input type="hidden" name="note" value="" />
      <SubmitBtn>أضف الشحنة</SubmitBtn>
    </form>
  );
}
