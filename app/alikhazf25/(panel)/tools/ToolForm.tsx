"use client";
/** نموذج الأداة — حقول الأدوات فقط (بلا قهوة) */
import { Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
import ToolSpecsEditor from "@/components/admin/ToolSpecsEditor";
import VariantsEditor, { type VariantRow } from "@/components/admin/VariantsEditor";
import type { schema as s } from "@/lib/server/db";
import type { ToolSpecs } from "@/lib/tool-specs";

type P = Partial<typeof s.products.$inferSelect>;
type Place = { id: number; name: string };
type Sub = { id: number; name: string };

export default function ToolForm({
  p = {}, places, subs, chosenPlaces = [], variants = [], action, submitLabel,
}: {
  p?: P; places: Place[]; subs: Sub[]; chosenPlaces?: number[]; variants?: VariantRow[];
  action: (f: FormData) => Promise<void>; submitLabel: string;
}) {
  const toolSpecs = (p.toolSpecs as ToolSpecs | null) ?? null;

  return (
    <form action={action} className="space-y-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="type" value="TOOL" />

      {/* الأساسي */}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="اسم الأداة"><input name="name" defaultValue={p.name} required className={inputCls} /></Field>
        <Field label="سعر القطعة" hint="للمنتج بلا خيارات فقط — يُتجاهل إن أضفت ألواناً أو مقاسات"><input name="pricePiece" defaultValue={p.pricePiece ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر العرض" hint="اختياري — يُعرض السعر الأصلي مشطوباً"><input name="salePrice" defaultValue={p.salePrice ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="تكلفة القطعة" hint="لحساب الربح — لا تظهر للزبون"><input name="costPiece" defaultValue={p.costPiece ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="المخزون (قطعة)" hint="للمنتج بلا خيارات فقط — إن أضفت خيارات فالمخزون مجموعها"><input name="stockPieces" defaultValue={p.stockPieces ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="الصنف">
          <select name="subcategoryId" defaultValue={p.subcategoryId ?? ""} className={inputCls}>
            <option value="">اختر الصنف</option>
            {subs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="الوصف المختصر"><input name="description" defaultValue={p.description ?? ""} className={inputCls} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="صور الأداة" hint="ارفع عدة صور — الأولى الرئيسية"><MultiImageUpload name="images" initial={p.images ?? []} /></Field>
        </div>
        <label className="flex items-center gap-2 pb-1 text-[13px] font-bold"><input type="checkbox" name="active" defaultChecked={p.active ?? true} className="h-4 w-4 accent-[#505445]" /> ظاهر بالمتجر</label>
      </Card>

      {/* الخيارات */}
      <Card className="p-5">
        <p className="mb-1 text-[14px] font-bold text-accent">خيارات المنتج</p>
        <p className="mb-4 text-[12px] text-muted">أحجام (V01/V02) · عبوات (٥٠/١٠٠ فلتر) · ألوان — لكل خيار سعره ومخزونه</p>
        <VariantsEditor initial={variants} />
      </Card>

      {/* تفاصيل الأداة */}
      <Card className="p-5">
        <p className="mb-4 text-[14px] font-bold text-accent">تفاصيل الأداة</p>
        <ToolSpecsEditor initial={toolSpecs} />
      </Card>

      {/* متقدم */}
      <details className="group rounded-[18px] border border-line bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-bold text-muted">
          إعدادات متقدمة (المعرّف · Badge · مخزون · أماكن الظهور) <span className="ms-1 inline-block transition-transform group-open:rotate-90">‹</span>
        </summary>
        <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-3">
          <Field label="المعرّف slug" hint="إنجليزي للرابط"><input name="slug" defaultValue={p.slug} required className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="Badge"><input name="badge" defaultValue={p.badge ?? ""} className={inputCls} placeholder="جديد" /></Field>
          <Field label="عتبة التنبيه (قطعة)" hint="تحتها يحذّرك النظام">
            <input name="stockThresholdBags" defaultValue={p.stockThreshold != null ? p.stockThreshold : 5} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <Field label="عند النفاد">
            <select name="oosBehavior" defaultValue={p.oosBehavior ?? "SHOW_BADGE"} className={inputCls}>
              <option value="SHOW_BADGE">شارة «نفد مؤقتاً»</option>
              <option value="HIDE">إخفاء كامل</option>
            </select>
          </Field>
          <div className="sm:col-span-3">
            <p className="mb-2 text-[12px] font-bold text-muted">أماكن الظهور <span className="font-normal">(اختر أين تظهر الأداة — يمكن أكثر من قسم)</span></p>
            <div className="flex flex-wrap gap-4">
              {places.map((pl) => (
                <label key={pl.id} className="flex items-center gap-2 text-[13px] font-bold">
                  <input type="checkbox" name="places" value={pl.id} defaultChecked={chosenPlaces.includes(pl.id)} className="h-4 w-4 accent-[#505445]" />
                  {pl.name}
                </label>
              ))}
            </div>
          </div>
          <input type="hidden" name="latinOrigin" value="" />
          <input type="hidden" name="flag" value="" />
          <input type="hidden" name="featured" value="" />
        </div>
      </details>

      <SubmitBtn>{submitLabel}</SubmitBtn>
    </form>
  );
}
