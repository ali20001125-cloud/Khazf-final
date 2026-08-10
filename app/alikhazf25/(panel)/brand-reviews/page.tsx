import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card } from "@/components/admin/ui";
import { saveBrandReview, deleteBrandReview } from "./actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-[10px] border border-line bg-bg px-3 py-2.5 text-[13.5px] outline-none focus:border-accent";

export default async function BrandReviewsPage() {
  const rows = await db.select().from(s.brandReviews).orderBy(asc(s.brandReviews.sort));

  return (
    <div>
      <PageTitle title="آراء البراند"
        sub="تُعرض في الرئيسية · للتقييمات الحقيقية قسم منفصل بصفحة كل منتج" />

      <Card className="mb-6 p-5">
        <p className="mb-3 text-[14px] font-bold">إضافة رأي</p>
        <form action={saveBrandReview} className="grid gap-3 sm:grid-cols-2">
          <textarea name="quote" rows={2} required placeholder="نصّ الرأي"
            className={`${inputCls} sm:col-span-2`} />
          <input name="author" placeholder="الاسم (اختياري)" className={inputCls} />
          <input name="context" placeholder="السياق — مثل: طلب سيرادو" className={inputCls} />
          <select name="rating" defaultValue={5} className={inputCls}>
            {[5, 4, 3].map((r) => <option key={r} value={r}>{"★".repeat(r)}</option>)}
          </select>
          <input name="sort" type="number" defaultValue={rows.length} placeholder="الترتيب"
            className={`${inputCls} font-num`} dir="ltr" />
          <label className="flex items-center gap-2 text-[13px] font-bold">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-[#505445]" />
            ظاهر
          </label>
          <button className="rounded-[10px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text sm:col-span-2">
            أضِف
          </button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-5">
            <form action={saveBrandReview} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={r.id} />
              <textarea name="quote" rows={2} defaultValue={r.quote} className={`${inputCls} sm:col-span-2`} />
              <input name="author" defaultValue={r.author ?? ""} placeholder="الاسم" className={inputCls} />
              <input name="context" defaultValue={r.context ?? ""} placeholder="السياق" className={inputCls} />
              <select name="rating" defaultValue={r.rating} className={inputCls}>
                {[5, 4, 3].map((x) => <option key={x} value={x}>{"★".repeat(x)}</option>)}
              </select>
              <input name="sort" type="number" defaultValue={r.sort} className={`${inputCls} font-num`} dir="ltr" />
              <label className="flex items-center gap-2 text-[13px] font-bold">
                <input type="checkbox" name="active" defaultChecked={r.active} className="h-4 w-4 accent-[#505445]" />
                ظاهر
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button className="rounded-[10px] border border-line px-5 py-2.5 text-[13px] font-bold">حفظ</button>
              </div>
            </form>
            <form action={deleteBrandReview} className="mt-2">
              <input type="hidden" name="id" value={r.id} />
              <button className="text-[12px] font-bold text-accent">حذف</button>
            </form>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="p-6 text-center text-[13px] text-muted">لا آراء بعد</Card>
        )}
      </div>
    </div>
  );
}
