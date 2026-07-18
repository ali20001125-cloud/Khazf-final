import { asc } from "drizzle-orm";
import Link from "next/link";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import { saveLevel, addGift, toggleGift } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage() {
  const levels = await db.select().from(s.journeyLevels).orderBy(asc(s.journeyLevels.level));
  const gifts = await db.select().from(s.boxGifts).orderBy(asc(s.boxGifts.sort));
  return (
    <div>
      <PageTitle title="الولاء والرحلة" sub="٦ مستويات تُصرف تلقائياً بالطلب التالي · هدايا البوكس (٦ أكياس)" />

      <h2 className="mb-3 text-lg font-bold">رحلة المكافآت</h2>
      <div className="grid gap-3">
        {levels.map((l) => (
          <Card key={l.level} className="p-4">
            <form action={saveLevel} className="grid items-end gap-3 sm:grid-cols-[60px_1fr_1fr_1fr_auto_auto]">
              <input type="hidden" name="level" value={l.level} />
              <p className="font-num text-2xl font-bold text-muted">{l.level}</p>
              <Field label="النوع">
                <select name="rewardType" defaultValue={l.rewardType} className={inputCls}>
                  <option value="PERCENT">خصم ٪</option><option value="FIXED">مبلغ ثابت</option>
                  <option value="FREE_DELIVERY">توصيل مجاني</option><option value="GIFT">هدية</option>
                </select>
              </Field>
              <Field label="القيمة"><input name="value" defaultValue={l.value} className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="اسم الهدية"><input name="giftName" defaultValue={l.giftName ?? ""} className={inputCls} /></Field>
              <label className="flex items-center gap-2 pb-2.5 text-[13px] font-bold">
                <input type="checkbox" name="active" defaultChecked={l.active} className="h-4 w-4 accent-[#505445]" /> فعّال
              </label>
              <SubmitBtn>حفظ</SubmitBtn>
            </form>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">هدايا البوكس</h2>
      <Card className="p-5">
        <ul className="divide-y divide-line">
          {gifts.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-3">
              <span className={`text-[14px] font-bold ${g.active ? "" : "text-muted line-through"}`}>{g.name}</span>
              <form action={toggleGift}>
                <input type="hidden" name="id" value={g.id} />
                <button className="text-[12px] font-bold text-muted hover:text-ink">{g.active ? "أوقف" : "فعّل"}</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addGift} className="mt-4 flex gap-2">
          <input name="name" placeholder="هدية جديدة…" className={inputCls} />
          <SubmitBtn>أضف</SubmitBtn>
        </form>
      </Card>

      <p className="mt-6 rounded-[14px] bg-bg-alt px-5 py-3.5 text-[12.5px] text-muted">
        نِسَب الكاش باك ومدة الصلاحية ومستويات البوكس — من <Link href="/admin/settings/" className="font-bold text-accent">الإعدادات</Link>
      </p>
    </div>
  );
}
