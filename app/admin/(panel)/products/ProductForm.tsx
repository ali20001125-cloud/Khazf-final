/** نموذج المنتج — الأساسي أولاً، والباقي بطية «متقدم» */
import { Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import MultiImageUpload from "@/components/admin/MultiImageUpload";
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
    <form action={action} className="space-y-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}

      {/* ═ الأساسي — بترتيب ما يراه الزبون ═ */}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="اسم المحصول"><input name="name" defaultValue={p.name} required className={inputCls} /></Field>
        <Field label="النوع">
          <select name="type" defaultValue={p.type ?? "COFFEE"} className={inputCls}>
            <option value="COFFEE">قهوة (بالأكياس)</option>
            <option value="TOOL">أداة (بالقطعة)</option>
          </select>
        </Field>
        <Field label="سعر ٢٥٠غ"><input name="priceG250" defaultValue={p.priceG250 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر ٥٠٠غ" hint="فارغ = ما يظهر"><input name="priceG500" defaultValue={p.priceG500 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        <Field label="سعر الكيلو" hint="فارغ = ما يظهر"><input name="priceG1000" defaultValue={p.priceG1000 ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
        {!isCoffee && <Field label="سعر القطعة"><input name="pricePiece" defaultValue={p.pricePiece ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>}
        <div className="sm:col-span-2"><Field label="صور المنتج" hint="ارفع عدة صور — الأولى الرئيسية"><MultiImageUpload name="images" initial={p.images ?? []} /></Field></div>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="active" defaultChecked={p.active ?? true} className="h-4 w-4 accent-[#505445]" /> ظاهر بالمتجر</label>
          <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="allowInBox" defaultChecked={p.allowInBox ?? isCoffee} className="h-4 w-4 accent-[#c9a961]" /> يدخل البوكس</label>
        </div>
      </Card>

      {/* ═ الأصل والطعم — مثل ترتيب صفحة المنتج ═ */}
      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="الدولة"><input name="country" defaultValue={p.country ?? ""} className={inputCls} placeholder="إثيوبيا" /></Field>
        <Field label="المنطقة"><input name="region" defaultValue={p.region ?? ""} className={inputCls} /></Field>
        <Field label="الارتفاع"><input name="altitude" defaultValue={p.altitude ?? ""} className={inputCls} placeholder="١٤٠٠م" /></Field>
        <Field label="المعالجة"><input name="process" defaultValue={p.process ?? ""} className={inputCls} placeholder="طبيعية" /></Field>
        <Field label="التحميص"><input name="roast" defaultValue={p.roast ?? ""} className={inputCls} placeholder="وسط" /></Field>
        <Field label="الإيحاءات" hint="بفاصلة ،"><input name="notes" defaultValue={(p.notes ?? []).join("، ")} className={inputCls} placeholder="توت، أزهار" /></Field>
        <div className="sm:col-span-3">
          <Field label="الوصف (يظهر بصفحة المحصول)">
            <textarea name="description" rows={2} defaultValue={p.description ?? ""} className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="جملة «لمن هذا المحصول؟»"><input name="trigger" defaultValue={p.trigger ?? ""} className={inputCls} /></Field>
        </div>
      </Card>

      {/* ═ متقدم — مطوي ═ */}
      <details className="group rounded-[18px] border border-line bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-bold text-muted">
          إعدادات متقدمة (Badge · مخزون · أماكن · نكهة · قصة) <span className="ms-1 inline-block transition-transform group-open:rotate-90">‹</span>
        </summary>
        <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-3">
          <Field label="المعرّف slug" hint="إنجليزي للرابط"><input name="slug" defaultValue={p.slug} required className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="Badge"><input name="badge" defaultValue={p.badge ?? ""} className={inputCls} placeholder="جديد" /></Field>
          <Field label="عتبة التنبيه (كيس)" hint="تحتها يحذّرك النظام">
            <input name="stockThresholdBags" defaultValue={p.stockThreshold != null ? Math.round(p.stockThreshold / (isCoffee ? 250 : 1)) : 8} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <Field label="عند النفاد">
            <select name="oosBehavior" defaultValue={p.oosBehavior ?? "SHOW_BADGE"} className={inputCls}>
              <option value="SHOW_BADGE">شارة «نفد مؤقتاً»</option>
              <option value="HIDE">إخفاء كامل</option>
            </select>
          </Field>
          <Field label="الاسم اللاتيني"><input name="latinName" defaultValue={p.latinName ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="السلالة"><input name="variety" defaultValue={p.variety ?? ""} className={inputCls} /></Field>
          <Field label="SCA"><input name="sca" defaultValue={p.sca ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="حموضة ١–٥"><input name="flavorAcidity" defaultValue={p.flavorAcidity ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="حلاوة ١–٥"><input name="flavorSweetness" defaultValue={p.flavorSweetness ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="قوام ١–٥"><input name="flavorBody" defaultValue={p.flavorBody ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
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
          <Field label="الصنف الفرعي (أدوات)">
            <select name="subcategoryId" defaultValue={p.subcategoryId ?? ""} className={inputCls}>
              <option value="">—</option>
              {subs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="المزرعة"><input name="farm" defaultValue={p.farm ?? ""} className={inputCls} /></Field>
          <div className="sm:col-span-3">
            <Field label="قصة المحصول"><textarea name="story" rows={2} defaultValue={p.story ?? ""} className={inputCls} /></Field>
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
