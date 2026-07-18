/** نموذج المنتج المشترك (إنشاء/تعديل) — خادمي بالكامل */
import { Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import { schema as s } from "@/lib/server/db";

type P = Partial<typeof s.products.$inferSelect>;
type Place = { id: number; name: string };
type Sub = { id: number; name: string };

export default function ProductForm({
  p = {}, places, subs, chosenPlaces = [], action, submitLabel,
}: {
  p?: P; places: Place[]; subs: Sub[]; chosenPlaces?: number[];
  action: (f: FormData) => Promise<void>; submitLabel: string;
}) {
  const isCoffee = (p.type ?? "COFFEE") === "COFFEE";
  return (
    <form action={action} className="space-y-5">
      {p.id && <input type="hidden" name="id" value={p.id} />}

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="النوع">
          <select name="type" defaultValue={p.type ?? "COFFEE"} className={inputCls}>
            <option value="COFFEE">قهوة (بالغرام)</option>
            <option value="TOOL">أداة (بالقطعة)</option>
          </select>
        </Field>
        <Field label="المعرّف slug" hint="إنجليزي بلا فراغات — يدخل بالرابط">
          <input name="slug" defaultValue={p.slug} required className={`${inputCls} font-num`} dir="ltr" />
        </Field>
        <Field label="الاسم"><input name="name" defaultValue={p.name} required className={inputCls} /></Field>
        <Field label="الاسم اللاتيني"><input name="latinName" defaultValue={p.latinName ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="Badge (اختياري)" hint="مثال: جديد، الأكثر مبيعاً"><input name="badge" defaultValue={p.badge ?? ""} className={inputCls} /></Field>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="active" defaultChecked={p.active ?? true} className="h-4 w-4 accent-[#505445]" /> فعّال</label>
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="featured" defaultChecked={p.featured ?? false} className="h-4 w-4 accent-[#505445]" /> الأكثر طلباً</label>
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="allowInBox" defaultChecked={p.allowInBox ?? isCoffee} className="h-4 w-4 accent-[#c9a961]" /> يدخل البوكس</label>
        </div>
      </Card>

      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="سعر ٢٥٠غ"><input name="priceG250" defaultValue={p.priceG250 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر ٥٠٠غ" hint="اتركه فارغاً = الوزن لا يُعرض"><input name="priceG500" defaultValue={p.priceG500 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر الكيلو" hint="يدوي — ممنوع الحساب الآلي"><input name="priceG1000" defaultValue={p.priceG1000 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر القطعة (أداة)"><input name="pricePiece" defaultValue={p.pricePiece ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="عتبة التنبيه" hint="غرام للقهوة / قطعة للأداة"><input name="stockThreshold" defaultValue={p.stockThreshold ?? 2000} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="عند النفاد">
          <select name="oosBehavior" defaultValue={p.oosBehavior ?? "SHOW_BADGE"} className={inputCls}>
            <option value="SHOW_BADGE">اعرض شارة «نفد»</option>
            <option value="HIDE">أخفِ المنتج</option>
          </select>
        </Field>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[12px] font-bold text-muted">أماكن الظهور</p>
        <div className="flex flex-wrap gap-4">
          {places.map((pl) => (
            <label key={pl.id} className="flex items-center gap-2 text-[13px] font-bold">
              <input type="checkbox" name="places" value={pl.id} defaultChecked={chosenPlaces.includes(pl.id)} className="h-4 w-4 accent-[#505445]" />
              {pl.name}
            </label>
          ))}
        </div>
        <Field label="الصنف الفرعي (للأدوات)">
          <select name="subcategoryId" defaultValue={p.subcategoryId ?? ""} className={`${inputCls} mt-2 max-w-xs`}>
            <option value="">—</option>
            {subs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
      </Card>

      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="الدولة"><input name="country" defaultValue={p.country ?? ""} className={inputCls} /></Field>
        <Field label="العلم 🇪🇹"><input name="flag" defaultValue={p.flag ?? ""} className={inputCls} /></Field>
        <Field label="الأصل اللاتيني"><input name="latinOrigin" defaultValue={p.latinOrigin ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="المنطقة"><input name="region" defaultValue={p.region ?? ""} className={inputCls} /></Field>
        <Field label="السلالة"><input name="variety" defaultValue={p.variety ?? ""} className={`${inputCls}`} /></Field>
        <Field label="المعالجة"><input name="process" defaultValue={p.process ?? ""} className={inputCls} /></Field>
        <Field label="التحميص"><input name="roast" defaultValue={p.roast ?? ""} className={inputCls} /></Field>
        <Field label="الارتفاع"><input name="altitude" defaultValue={p.altitude ?? ""} className={inputCls} /></Field>
        <Field label="SCA"><input name="sca" defaultValue={p.sca ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="الإيحاءات" hint="مفصولة بفاصلة عربية ،">
          <input name="notes" defaultValue={(p.notes ?? []).join("، ")} className={inputCls} />
        </Field>
        <Field label="حموضة ١–٥"><input name="flavorAcidity" defaultValue={p.flavorAcidity ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="حلاوة ١–٥"><input name="flavorSweetness" defaultValue={p.flavorSweetness ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="قوام ١–٥"><input name="flavorBody" defaultValue={p.flavorBody ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
      </Card>

      <Card className="grid gap-4 p-5">
        <Field label="جملة «لمن هذا؟»"><input name="trigger" defaultValue={p.trigger ?? ""} className={inputCls} /></Field>
        <Field label="الوصف"><textarea name="description" rows={3} defaultValue={p.description ?? ""} className={inputCls} /></Field>
        <Field label="المزرعة (اختياري)"><input name="farm" defaultValue={p.farm ?? ""} className={inputCls} /></Field>
        <Field label="قصة المحصول (اختياري)" hint="تظهر بصفحة المنتج فقط إذا كُتبت">
          <textarea name="story" rows={3} defaultValue={p.story ?? ""} className={inputCls} />
        </Field>
        <Field label="الصور (روابط، سطر لكل صورة)" hint="رفع مباشر إلى Supabase Storage — يُفعَّل عند النشر">
          <textarea name="images" rows={2} defaultValue={(p.images ?? []).join("\n")} className={`${inputCls} font-num`} dir="ltr" />
        </Field>
      </Card>

      <SubmitBtn>{submitLabel}</SubmitBtn>
    </form>
  );
}
