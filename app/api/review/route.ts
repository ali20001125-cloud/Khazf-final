import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?token= — يرجّع تفاصيل الطلب ومنتجاته لصفحة التقييم */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "رمز مفقود" }, { status: 400 });

  const [order] = await db
    .select({
      id: s.orders.id, orderNumber: s.orders.orderNumber,
      name: s.orders.name, status: s.orders.status, phone: s.orders.customerPhone,
    })
    .from(s.orders)
    .where(eq(s.orders.reviewToken, token));

  if (!order) return NextResponse.json({ error: "رابط التقييم غير صالح" }, { status: 404 });

  // منتجات الطلب (قهوة فقط — الأدوات لا تُقيّم كمحصول)
  const items = await db
    .select({
      productId: s.orderItems.productId,
      name: s.orderItems.nameSnapshot,
      slug: s.products.slug,
      images: s.products.images,
    })
    .from(s.orderItems)
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .where(eq(s.orderItems.orderId, order.id));

  // نمنع التكرار (منتج مكرر بالطلب يظهر مرة)
  const seen = new Set<number>();
  const products = items
    .filter((i) => i.productId != null)
    .filter((i) => (seen.has(i.productId!) ? false : (seen.add(i.productId!), true)))
    .map((i) => ({ productId: i.productId!, name: i.name, slug: i.slug, image: i.images?.[0] ?? null }));

  // هل قُيّم هذا الطلب سابقاً؟
  const already = await db.select({ id: s.experienceReviews.id })
    .from(s.experienceReviews).where(eq(s.experienceReviews.orderId, order.id));

  return NextResponse.json({
    order: { orderNumber: order.orderNumber, name: order.name, status: order.status },
    products,
    alreadyReviewed: already.length > 0,
  });
}

/** POST — يستقبل تقييمات المنتجات + التجربة دفعة واحدة */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "رمز مفقود" }, { status: 400 });

  const [order] = await db
    .select({ id: s.orders.id, phone: s.orders.customerPhone })
    .from(s.orders)
    .where(eq(s.orders.reviewToken, body.token));
  if (!order) return NextResponse.json({ error: "رابط غير صالح" }, { status: 404 });

  // منع التقييم المكرّر لنفس الطلب
  const existing = await db.select({ id: s.experienceReviews.id })
    .from(s.experienceReviews).where(eq(s.experienceReviews.orderId, order.id));
  if (existing.length > 0)
    return NextResponse.json({ error: "شكراً — سبق أن قيّمت هذا الطلب" }, { status: 409 });

  const showName: boolean = !!body.showName;
  const displayName = showName && body.name?.trim() ? body.name.trim().slice(0, 40) : "مشترٍ موثّق";

  // ١) تقييمات المنتجات
  const productReviews: { productId: number; rating: number; comment?: string }[] = Array.isArray(body.products) ? body.products : [];
  for (const pr of productReviews) {
    const rating = Math.round(Number(pr.rating));
    if (!pr.productId || !rating || rating < 1 || rating > 5) continue;
    // تأكد أن المنتج ضمن هذا الطلب
    const inOrder = await db.execute(sql`
      SELECT 1 FROM order_items WHERE order_id = ${order.id} AND product_id = ${pr.productId} LIMIT 1`);
    if ((inOrder.rowCount ?? 0) === 0) continue;
    await db.insert(s.reviews).values({
      productId: pr.productId,
      customerPhone: order.phone,
      customerName: displayName,
      rating,
      comment: pr.comment?.trim()?.slice(0, 500) || null,
      orderId: order.id,
      verified: true,       // موثّق — من رمز طلب حقيقي
      status: "PENDING",    // يُنشر بعد موافقة الإدارة
    });
  }

  // ٢) تقييم التجربة العامة
  const ex = body.experience ?? {};
  const clamp = (n: unknown) => {
    const v = Math.round(Number(n));
    return v >= 1 && v <= 5 ? v : null;
  };
  await db.insert(s.experienceReviews).values({
    orderId: order.id,
    customerPhone: order.phone,
    deliveryRating: clamp(ex.delivery),
    courierRating: clamp(ex.courier),
    easeRating: clamp(ex.ease),
    comment: ex.comment?.trim()?.slice(0, 500) || null,
    status: "PENDING",
  });

  return NextResponse.json({ ok: true, message: "وصل تقييمك — شكراً لك 🤎" });
}
