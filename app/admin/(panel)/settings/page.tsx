import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import { savePublicSettings, saveInternalSettings, addAdmin } from "./actions";
import ImageUpload from "@/components/admin/ImageUpload";
import { supabaseConfigured } from "@/lib/server/admin-auth";
import type { BoxTier } from "@/lib/server/db/schema";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [pub] = await db.select().from(s.settings).where(eq(s.settings.id, 1));
  const [internal] = await db.select().from(s.settingsInternal).where(eq(s.settingsInternal.id, 1));
  const admins = await db.select().from(s.admins).orderBy(asc(s.admins.id));
  const tiers = (pub.boxTiers as BoxTier[]).concat(
    Array.from({ length: Math.max(0, 4 - (pub.boxTiers as BoxTier[]).length) }, () => ({ bags: 0, rewardType: "PERCENT" as const, value: 0 }))
  );

  return (
    <div>
      <PageTitle title="الإعدادات" sub="مصدر الحقيقة الوحيد — المتجر كله يقرأ من هنا" />

      {/* عامة */}
      <form action={savePublicSettings}>
        <Card className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="سعر التوصيل (الزبون)" hint="موحّد لكل العراق">
            <input name="deliveryCustomerPrice" defaultValue={pub.deliveryCustomerPrice} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <Field label="كل … دينار = نقطة"><input name="cashbackPerAmount" defaultValue={pub.cashbackPerAmount} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="قيمة النقطة (د.ع)"><input name="pointValue" defaultValue={pub.pointValue} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="صلاحية الولاء (يوم)"><input name="loyaltyValidityDays" defaultValue={pub.loyaltyValidityDays} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="انستغرام"><input name="instagram" defaultValue={pub.instagram ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="هاتف التواصل"><input name="contactPhone" defaultValue={pub.contactPhone ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="وضع «الأكثر طلباً»">
            <select name="featuredMode" defaultValue={pub.featuredMode} className={inputCls}>
              <option value="manual">يدوي (أنت تختار)</option><option value="auto">تلقائي من المبيعات</option>
            </select>
          </Field>
          <Field label="لوغو خزف (يظهر بالهيرو)" hint="ارفعه من جهازك — أو اتركه فارغاً فيظهر الاسم كتابةً">
            <ImageUpload name="logoUrl" initial={pub.logoUrl} />
          </Field>
          <Field label="Meta Pixel ID" hint="من Facebook Events Manager — يفعّل تتبع الإعلانات">
            <input name="metaPixelId" defaultValue={pub.metaPixelId ?? ""} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <Field label="Google Analytics ID" hint="مثل G-XXXXXXX — يعطيك الزيارات لحظياً">
            <input name="gaId" defaultValue={pub.gaId ?? ""} className={`${inputCls} font-num`} dir="ltr" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="رسائل الشريط العلوي" hint="سطر لكل رسالة — تتناوب بالمتجر">
              <textarea name="topBarMessages" rows={2} defaultValue={pub.topBarMessages.join("\n")} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card className="mt-4 p-5">
          <h2 className="mb-4 text-sm font-bold">مستويات البوكس</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {tiers.slice(0, 4).map((t, i) => (
              <div key={i} className="space-y-2 rounded-[14px] border border-line p-3">
                <Field label="الأكياس"><input name={`tier${i + 1}_bags`} defaultValue={t.bags || ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
                <Field label="المكافأة">
                  <select name={`tier${i + 1}_type`} defaultValue={t.rewardType} className={inputCls}>
                    <option value="PERCENT">خصم ٪</option><option value="FREE_DELIVERY">توصيل مجاني</option><option value="GIFT">هدية</option>
                  </select>
                </Field>
                <Field label="القيمة"><input name={`tier${i + 1}_value`} defaultValue={t.value ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
              </div>
            ))}
          </div>
          <div className="mt-4"><SubmitBtn>حفظ الإعدادات العامة</SubmitBtn></div>
        </Card>
      </form>

      {/* داخلية */}
      <form action={saveInternalSettings}>
        <Card className="mt-6 grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><h2 className="text-sm font-bold">داخلي — لا يراه المتجر أبداً</h2></div>
          <Field label="تكلفة توصيل البصرة (الشركة)"><input name="deliveryCostBasra" defaultValue={internal.deliveryCostBasra} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="تكلفة باقي المحافظات"><input name="deliveryCostOther" defaultValue={internal.deliveryCostOther} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="Telegram Bot Token"><input name="telegramBotToken" defaultValue={internal.telegramBotToken ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="Telegram Chat ID"><input name="telegramChatId" defaultValue={internal.telegramChatId ?? ""} className={`${inputCls} font-num`} dir="ltr" /></Field>
          <div className="flex flex-wrap gap-5 sm:col-span-2">
            <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="notifyNewOrder" defaultChecked={internal.notifyNewOrder} className="h-4 w-4 accent-[#505445]" /> إشعار طلب جديد</label>
            <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="notifyLowStock" defaultChecked={internal.notifyLowStock} className="h-4 w-4 accent-[#505445]" /> إشعار مخزون منخفض</label>
            <label className="flex items-center gap-2 text-[13px] font-bold"><input type="checkbox" name="notifyNewReview" defaultChecked={internal.notifyNewReview} className="h-4 w-4 accent-[#505445]" /> إشعار تقييم جديد</label>
          </div>
          <div><SubmitBtn>حفظ الداخلي</SubmitBtn></div>
        </Card>
      </form>

      {/* المدراء */}
      <Card className="mt-6 p-5">
        <h2 className="mb-1 text-sm font-bold">المدراء</h2>
        <p className="mb-4 text-[12px] text-muted">
          {supabaseConfigured()
            ? "الدخول عبر Google — الإيميلات أدناه هي المصرّح لها"
            : "حالياً: كلمة مرور محلية (ADMIN_PASSWORD) · عند تفعيل Supabase يتحوّل الدخول لـ Google بهذه الإيميلات"}
        </p>
        <ul className="divide-y divide-line">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5 text-[13.5px]">
              <span className="font-bold">{a.name}</span>
              <span className="font-num text-[12px] text-muted" dir="ltr">{a.email ?? "—"}</span>
            </li>
          ))}
          {admins.length === 0 && <li className="py-3 text-[13px] text-muted">أضف إيميلك قبل النشر حتى يُفتح لك الدخول بـ Google</li>}
        </ul>
        <form action={addAdmin} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input name="name" placeholder="الاسم" className={inputCls} />
          <input name="email" type="email" placeholder="email@gmail.com" className={`${inputCls} font-num`} dir="ltr" />
          <SubmitBtn>أضف مديراً</SubmitBtn>
        </form>
      </Card>
    </div>
  );
}
