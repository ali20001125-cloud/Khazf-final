import { desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, Field, inputCls, SubmitBtn, money, dateAr } from "@/components/admin/ui";
import { createCoupon, toggleCoupon } from "./actions";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const rows = await db.select().from(s.coupons).orderBy(desc(s.coupons.createdAt));
  const tl: Record<string, string> = { PERCENT: "نسبة ٪", FIXED: "مبلغ ثابت", FREE_DELIVERY: "توصيل مجاني" };
  return (
    <div>
      <PageTitle title="أكواد الخصم" sub="عامة أو موجّهة لزبون · بحدود استخدام" />
      <Card className="mb-6 p-5">
        <h2 className="mb-4 text-sm font-bold">+ كود جديد</h2>
        <form action={createCoupon} className="grid gap-3 sm:grid-cols-3">
          <Field label="الكود"><input name="code" required className={`${inputCls} font-num uppercase`} dir="ltr" /></Field>
          <Field label="النوع">
            <select name="type" className={inputCls}>
              <option value="PERCENT">نسبة ٪</option><option value="FIXED">مبلغ ثابت</option><option value="FREE_DELIVERY">توصيل مجاني</option>
            </select>
          </Field>
          <Field label="القيمة"><input name="value" className={`${inputCls} font-num`} dir="ltr" placeholder="10 أو 5000" /></Field>
          <Field label="ينتهي في"><input type="date" name="expiresAt" className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="حد الاستخدام الكلي"><input name="usageLimit" className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="حد لكل زبون"><input name="perCustomerLimit" className={`${inputCls} font-num`} dir="ltr" /></Field>
          <Field label="موجّه لهاتف (اختياري)"><input name="targetPhone" className={`${inputCls} font-num`} dir="ltr" placeholder="07XXXXXXXXX" /></Field>
          <div className="flex items-end sm:col-span-2"><SubmitBtn>أنشئ الكود</SubmitBtn></div>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-line"><tr><Th>الكود</Th><Th>النوع</Th><Th>القيمة</Th><Th>الاستخدام</Th><Th>ينتهي</Th><Th>موجّه</Th><Th>الحالة</Th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.code}>
                <Td className="font-num font-bold">{c.code}</Td>
                <Td>{tl[c.type]}</Td>
                <Td className="font-num">{c.type === "PERCENT" ? `${c.value}٪` : c.type === "FIXED" ? money(c.value) : "—"}</Td>
                <Td className="font-num">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</Td>
                <Td className="font-num text-[12px] text-muted">{c.expiresAt ? dateAr(c.expiresAt) : "—"}</Td>
                <Td className="font-num text-[12px]"><span dir="ltr">{c.targetPhone ?? "—"}</span></Td>
                <Td>
                  <form action={toggleCoupon}>
                    <input type="hidden" name="code" value={c.code} />
                    <button className={`text-[12px] font-bold ${c.active ? "text-ok" : "text-muted"}`}>{c.active ? "فعّال — أوقف" : "موقوف — فعّل"}</button>
                  </form>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && <tr><Td className="py-8 text-center text-muted">لا أكواد بعد — وهذا طبيعي: مكافآتنا بالرحلة والبوكس</Td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
