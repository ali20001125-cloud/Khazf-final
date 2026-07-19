import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import { addBanner, toggleBanner, deleteBanner } from "./actions";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const rows = await db.select().from(s.banners).orderBy(asc(s.banners.sort));
  return (
    <div>
      <PageTitle title="البنرات" sub="حملة = جملة + زر + رابط · تظهر بطاقةً بارزة تحت هيرو الرئيسية فور تفعيلها" />
      <Card className="mb-6 p-5">
        <form action={addBanner} className="grid gap-3 sm:grid-cols-4">
          <Field label="النص"><input name="text" required className={inputCls} /></Field>
          <Field label="نص الزر (اختياري)"><input name="promoText" className={inputCls} /></Field>
          <Field label="الرابط"><input name="promoLink" className={`${inputCls} font-num`} dir="ltr" placeholder="/box/" /></Field>
          <div className="flex items-end"><SubmitBtn>أضف بنراً</SubmitBtn></div>
        </form>
      </Card>
      <div className="grid gap-3">
        {rows.map((b) => (
          <Card key={b.id} className="flex flex-wrap items-center gap-4 p-4">
            <p className={`flex-1 text-[14px] font-bold ${b.active ? "" : "text-muted line-through"}`}>{b.text}</p>
            {b.promoText && <span className="rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-muted">{b.promoText} → {b.promoLink}</span>}
            <form action={toggleBanner}><input type="hidden" name="id" value={b.id} />
              <button className={`text-[12px] font-bold ${b.active ? "text-ok" : "text-muted"}`}>{b.active ? "فعّال" : "موقوف"}</button>
            </form>
            <form action={deleteBanner}><input type="hidden" name="id" value={b.id} />
              <button className="text-[12px] font-bold text-accent">حذف</button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
