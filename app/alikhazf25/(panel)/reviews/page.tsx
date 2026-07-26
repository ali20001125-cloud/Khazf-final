import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, StatusBadge, dateAr, inputCls } from "@/components/admin/ui";
import { setReviewStatus, replyReview } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const rows = await db
    .select({
      id: s.reviews.id, name: s.reviews.customerName, rating: s.reviews.rating,
      comment: s.reviews.comment, verified: s.reviews.verified, status: s.reviews.status,
      reply: s.reviews.reply, at: s.reviews.createdAt, pname: s.products.name, phone: s.reviews.customerPhone,
    })
    .from(s.reviews)
    .innerJoin(s.products, sql`${s.products.id} = ${s.reviews.productId}`)
    .orderBy(sql`CASE WHEN ${s.reviews.status}='PENDING' THEN 0 ELSE 1 END`, desc(s.reviews.createdAt))
    .limit(60);

  const experience = await db
    .select({
      id: s.experienceReviews.id, delivery: s.experienceReviews.deliveryRating,
      courier: s.experienceReviews.courierRating, ease: s.experienceReviews.easeRating,
      comment: s.experienceReviews.comment, at: s.experienceReviews.createdAt,
      orderNumber: s.orders.orderNumber, phone: s.experienceReviews.customerPhone,
    })
    .from(s.experienceReviews)
    .innerJoin(s.orders, sql`${s.orders.id} = ${s.experienceReviews.orderId}`)
    .orderBy(desc(s.experienceReviews.createdAt))
    .limit(40);

  const stars = (n: number | null) => n ? "★".repeat(n) + "☆".repeat(5 - n) : "—";

  return (
    <div>
      <PageTitle title="التقييمات" sub="لا يُنشر شيء بلا موافقتك · «موثّق» = طلب مُسلَّم يحوي المنتج" />

      {/* تقييمات التجربة (توصيل/مندوب/سهولة) */}
      {experience.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold">تقييم التجربة والتوصيل</h2>
          <div className="grid gap-3">
            {experience.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]">
                  <span className="font-num font-bold text-accent">{e.orderNumber}</span>
                  <span>التوصيل: <span className="font-num text-gold">{stars(e.delivery)}</span></span>
                  <span>المندوب: <span className="font-num text-gold">{stars(e.courier)}</span></span>
                  <span>سهولة الشراء: <span className="font-num text-gold">{stars(e.ease)}</span></span>
                </div>
                {e.comment && <p className="mt-2.5 text-[13px] leading-relaxed">{e.comment}</p>}
                <p className="font-num mt-2 text-[11px] text-muted">{e.phone} · {dateAr(e.at)}</p>
              </Card>
            ))}
          </div>
          <h2 className="mb-3 mt-8 text-[15px] font-bold">تقييمات المحاصيل</h2>
        </div>
      )}
      <div className="grid gap-4">
        {rows.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold">{r.name}</span>
              <span className="font-num text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
              {r.verified && <span className="rounded-full bg-ok/10 px-2.5 py-0.5 text-[10px] font-bold text-ok">شراء موثّق</span>}
              <span className="text-[12px] font-bold text-accent">{r.pname}</span>
              <span className="ms-auto"><StatusBadge status={r.status} /></span>
            </div>
            {r.comment && <p className="mt-3 text-[13.5px] leading-relaxed">{r.comment}</p>}
            <p className="font-num mt-2 text-[11px] text-muted">{r.phone} · {dateAr(r.at)}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {r.status !== "PUBLISHED" && (
                <form action={setReviewStatus}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="PUBLISHED" />
                  <button className="rounded-[10px] bg-ok px-4 py-2 text-[12px] font-bold text-olive-text">انشر ✓</button>
                </form>
              )}
              {r.status !== "HIDDEN" && (
                <form action={setReviewStatus}>
                  <input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="HIDDEN" />
                  <button className="rounded-[10px] bg-bg-alt px-4 py-2 text-[12px] font-bold text-muted">أخفِ</button>
                </form>
              )}
              <form action={replyReview} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input name="reply" defaultValue={r.reply ?? ""} placeholder="رد خزف (اختياري)…" className={inputCls} />
                <button className="shrink-0 rounded-[10px] bg-olive px-4 py-2 text-[12px] font-bold text-olive-text">رد</button>
              </form>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-10 text-center text-muted">لا تقييمات بعد</Card>}
      </div>
    </div>
  );
}
