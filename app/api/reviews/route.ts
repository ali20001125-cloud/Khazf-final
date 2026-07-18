import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getCustomerPhone } from "@/lib/server/customer-session";

export const runtime = "nodejs";

/** GET ?slug= — المنشورة فقط */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ reviews: [] });
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug));
  if (!p) return NextResponse.json({ reviews: [] });
  const rows = await db
    .select({
      id: s.reviews.id, name: s.reviews.customerName, rating: s.reviews.rating,
      comment: s.reviews.comment, verified: s.reviews.verified,
      reply: s.reviews.reply, createdAt: s.reviews.createdAt,
    })
    .from(s.reviews)
    .where(and(eq(s.reviews.productId, p.id), eq(s.reviews.status, "PUBLISHED")))
    .orderBy(desc(s.reviews.createdAt))
    .limit(30);
  return NextResponse.json({ reviews: rows });
}

/** POST — يتطلب هوية زبون (طلب سابق)؛ يُنشر بعد موافقة الإدارة */
export async function POST(req: Request) {
  const phone = await getCustomerPhone();
  if (!phone)
    return NextResponse.json({ error: "التقييم متاح بعد أول طلب — حتى تبقى الآراء حقيقية" }, { status: 401 });
  const { slug, rating, comment, name } = (await req.json().catch(() => ({}))) as {
    slug?: string; rating?: number; comment?: string; name?: string;
  };
  const r = Math.round(Number(rating));
  if (!slug || !r || r < 1 || r > 5) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  const [p] = await db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug));
  if (!p) return NextResponse.json({ error: "منتج غير موجود" }, { status: 404 });

  /* موثّق = عنده طلب مُسلَّم يحوي هذا المنتج */
  const v = await db.execute(sql`
    SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
    WHERE o.customer_phone = ${phone} AND o.status = 'DELIVERED' AND i.product_id = ${p.id} LIMIT 1`);
  const [c] = await db.select({ name: s.customers.name }).from(s.customers).where(eq(s.customers.phone, phone));

  await db.insert(s.reviews).values({
    productId: p.id, customerPhone: phone,
    customerName: (name?.trim() || c?.name || "زبون خزف").slice(0, 40),
    rating: r, comment: comment?.trim()?.slice(0, 600) || null,
    verified: (v.rowCount ?? 0) > 0, status: "PENDING",
  });
  return NextResponse.json({ ok: true, message: "شكراً! تقييمك قيد المراجعة وسيظهر بعد الموافقة" });
}
