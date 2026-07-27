"use client";
/** نموذج المنتج — يعرض حقول القهوة أو الأدوات حسب النوع المختار */
import { useState } from "react";
import { Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
import ToolSpecsEditor from "@/components/admin/ToolSpecsEditor";
import type { schema as s } from "@/lib/server/db";
import type { ToolSpecs } from "@/lib/tool-specs";

type P = Partial<typeof s.products.$inferSelect>;
type Place = { id: number; name: string };
type Sub = { id: number; name: string };

export default function ProductForm({
  p = {}, places, subs, chosenPlaces = [], action, submitLabel,
}: {
  p?: P; places: Place[]; subs: Sub[]; chosenPlaces?: number[];
  action: (f: FormData) => Promise<void>; submitLabel: string;
}) {
  const [type, setType] = useState<"COFFEE" | "TOOL">((p.type as "COFFEE" | "TOOL") ?? "COFFEE");
  const isCoffee = type === "COFFEE";
  const toolSpecs = (p.toolSpecs as ToolSpecs | null) ?? null;

  return (
    <form action={action} className="space-y-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}

      {/* الأساسي */}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label={isCoffee ? "اسم المحصول" : "اسم الأداة"}>
          <input name="name" defaultValue={p.name} required className={inputCls} />
        </Field>
        <Field label="النوع">
          <select name="type" value={type} onChange={(e) => setType(e.target.value as "COFFEE" | "TOOL")} className={inputCls}>
            <option value="COFFEE">قهوة (بالأكياس)</option>
            <option value="TOOL">أداة (بالقطعة)</option>
          </select>
        </Field>

        {isCoffee ? (
          <>
            <Field label="سعر ٢٥٠غ"><input name="priceG250" defaultValue={p.priceG250 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="سعر ٥٠٠غ" hint="فارغ = ما يظهر"><input name="priceG500" defaultValue={p.priceG500 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="سعر الكيلو" hint="فارغ = ما يظهر"><input name="priceG1000" defaultValue={p.priceG1000 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          </>
        ) : (
          <>
            <Field label="سعر القطعة"><input name="pricePiece" defaultValue={p.pricePiece ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="الصنف">
              <select name="subcategoryId" defaultValue={p.subcategoryId ?? ""} className={inputCls}>
                <option value="">اختر الصنف</option>
                {subs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
          </>
        )}

        <div className="sm:col-span-2">
          <Field label="صور المنتج" hint="ارفع عدة صور — الأولى الرئيسية">
            <MultiImageUpload name="images" initial={p.images ?? []} />
          </Field>
        </div>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="active" defaultChecked={p.active ?? true} className="h-4 w-4 accent-[#505445]" /> ظاهر بالمتجر</label>
          {isCoffee && <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="allowInBox" defaultChecked={p.allowInBox ?? true} className="h-4 w-4 accent-[#c9a961]" /> يدخل البوكس</label>}
        </div>
      </Card>

      {/* الوصف */}
      <Card className="grid gap-4 p-5">
        <Field label="الوصف (يظهر بصفحة المنتج)">
          <textarea name="description" rows={2} defaultValue={p.description ?? ""} className={inputCls} />
        </Field>
        {isCoffee && (
          <Field label="جملة «لمن هذا المحصول؟»"><input name="trigger" defaultValue={p.trigger ?? ""} className={inputCls} /></Field>
        )}
      </Card>

      {/* حقول القهوة */}
      {isCoffee && (
        <Card className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="الدولة"><input name="country" defaultValue={p.country ?? ""} className={inputCls} placeholder="إثيوبيا" /></Field>
          <Field label="المنطقة"><input name="region" defaultValue={p.region ?? ""} className={inputCls} /></Field>
          <Field label="الارتفاع"><input name="altitude" defaultValue={p.altitude ?? ""} className={inputCls} placeholder="١٤٠٠م" /></Field>
          <Field label="المعالجة"><input name="process" defaultValue={p.process ?? ""} className={inputCls} placeholder="طبيعية" /></Field>
          <Field label="التحميص"><input name="roast" defaultValue={p.roast ?? ""} className={inputCls} placeholder="وسط" /></Field>
          <Field label="الإيحاءات" hint="بفاصلة ،"><input name="notes" defaultValue={(p.notes ?? []).join("، ")} className={inputCls} placeholder="توت، أزهار" /></Field>
        </Card>
      )}

      {/* تفاصيل الأداة */}
      {!isCoffee && (
        <Card className="p-5">
          <p className="mb-4 text-[14px] font-bold text-accent">تفاصيل الأداة</p>
          <ToolSpecsEditor initial={toolSpecs} />
        </Card>
      )}

      {/* متقدم */}
      <details className="group rounded-[18px] border border-line bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-bold text-muted">
          إعدادات متقدمة (المعرّف · Badge · مخزون{isCoffee ? " · نكهة · قصة" : ""}) <span className="ms-1 inline-block transition-transform group-open:rotate-90">‹</span>
        </summary>
        <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-3">
          <Field label="المعرّف slug" hint="إنجليزي للرابط"><input name="slug" defaultValue={p.slug} required className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="Badge"><input name="badge" defaultValue={p.badge ?? ""} className={inputCls} placeholder="جديد" /></Field>
          <Field label={`عتبة التنبيه (${isCoffee ? "كيس" : "قطعة"})`} hint="تحتها يحذّرك النظام">
            <input name="stockThresholdBags" defaultValue={p.stockThreshold != null ? Math.round(p.stockThreshold / (isCoffee ? 250 : 1)) : 8} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <Field label="عند النفاد">
            <select name="oosBehavior" defaultValue={p.oosBehavior ?? "SHOW_BADGE"} className={inputCls}>
              <option value="SHOW_BADGE">شارة «نفد مؤقتاً»</option>
              <option value="HIDE">إخفاء كامل</option>
            </select>
          </Field>

          {isCoffee && (
            <>
              <Field label="الاسم اللاتيني"><input name="latinName" defaultValue={p.latinName ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="السلالة"><input name="variety" defaultValue={p.variety ?? ""} className={inputCls} /></Field>
              <Field label="SCA"><input name="sca" defaultValue={p.sca ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="حموضة ١–٥"><input name="flavorAcidity" defaultValue={p.flavorAcidity ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="حلاوة ١–٥"><input name="flavorSweetness" defaultValue={p.flavorSweetness ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="قوام ١–٥"><input name="flavorBody" defaultValue={p.flavorBody ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="المزرعة"><input name="farm" defaultValue={p.farm ?? ""} className={inputCls} /></Field>
              <div className="sm:col-span-3">
                <Field label="قصة المحصول"><textarea name="story" rows={2} defaultValue={p.story ?? ""} className={inputCls} /></Field>
              </div>
            </>
          )}

          <div className="sm:col-span-3">
            <p className="mb-2 text-[12px] font-bold text-muted">أماكن الظهور</p>
            <div className="flex flex-wrap gap-4">
              {places.map((pl) => (
                <label key={pl.id} className="flex items-center gap-2 text-[13px] font-bold">
                  <input type="checkbox" name="places" value={pl.id} defaultChecked={chosenPlaces.includes(pl.id)} className="h-4 w-4 accent-[#505445]" />
                  {pl.name}
                </label>
              ))}
            </div>
          </div>

          <input type="hidden" name="latinOrigin" value={p.latinOrigin ?? ""} />
          <input type="hidden" name="flag" value={p.flag ?? ""} />
          <input type="hidden" name="featured" value="" />
        </div>
      </details>

      <SubmitBtn>{submitLabel}</SubmitBtn>
    </form>
  );
}
