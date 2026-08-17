import { NextResponse } from "next/server";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getCustomerIdentity } from "@/lib/server/customer-identity";
import { setCustomerCookie } from "@/lib/server/customer-session";
import { getSettings } from "@/lib/server/settings";
import { asc } from "drizzle-orm";
import { settleLoyalty } from "@/lib/server/loyalty";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * يشتق اسماً معقولاً من الإيميل:
 * - يأخذ الجزء قبل @
 * - يزيل الأرقام والرموز (ali20001125 → ali)
 * - يفصل الكلمات المدموجة/المفصولة (ahmed.ali أو ahmedali → Ahmed Ali)
 * - يجعل أول حرف كبير
 */
function nameFromEmail(email: string): string {
  let local = email.split("@")[0];
  // فصل بالنقطة/الشرطة/الأندرسكور
  local = local.replace(/[._-]+/g, " ");
  // إزالة الأرقام
  local = local.replace(/\d+/g, " ").trim();
  if (!local) return "صديق خزف";
  // لو كلمة واحدة مدموجة بأحرف كبيرة (AhmedAli) نفصلها
  const parts = local.includes(" ")
    ? local.split(/\s+/)
    : local.replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/);
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  return parts.filter(Boolean).slice(0, 2).map(cap).join(" ") || "صديق خزف";
}

export async function GET() {
  const identity = await getCustomerIdentity();
  const authUser = identity.authUser;
  let phone = identity.phone;
  let linked = identity.linked;

  /* ═ شفاء الهوية ═
     دخل بإيميل موثّق لكن رقمه غير مربوط (أو رقم مؤقّت auth:) — نجيب رقمه الحقيقي
     من طلب سابق بنفس الإيميل، ونربطه تلقائياً فتظهر طلباته ونقاطه. */
  const authEmail = authUser?.email?.trim().toLowerCase() || null;
  if (authUser && authEmail && (!phone || phone.startsWith("auth:"))) {
    const [ord] = await db
      .select({ p: s.orders.customerPhone })
      .from(s.orders)
      .where(sql`lower(${s.orders.email}) = ${authEmail} AND ${s.orders.customerPhone} NOT LIKE 'auth:%'`)
      .orderBy(desc(s.orders.createdAt))
      .limit(1);
    if (ord?.p) {
      const real = ord.p;
      const [row] = await db
        .select({ auth: s.customers.authUserId, email: s.customers.email })
        .from(s.customers)
        .where(eq(s.customers.phone, real));
      // نفس الإيميل = نفس الشخص (سجّل بالرمز مرّة وبـGoogle مرّة) → نوحّدهم.
      const sameEmail = !!row?.email && row.email.toLowerCase() === authEmail;
      // نتبنّى الرقم إن كان غير مربوط، أو مربوطاً بحسابنا، أو بحساب بنفس الإيميل
      if (!row || !row.auth || row.auth === authUser.id || sameEmail) {
        // نفكّ السجلّ المؤقّت لحسابنا
        await db.update(s.customers).set({ authUserId: null })
          .where(sql`${s.customers.authUserId} = ${authUser.id} AND ${s.customers.phone} LIKE 'auth:%'`)
          .catch(() => {});
        // نربط الرقم بحسابنا فقط إن كان غير مربوط (لا ننتزعه من حساب آخر بنفس الإيميل)
        if (row && !row.auth) {
          await db.update(s.customers).set({ authUserId: authUser.id })
            .where(eq(s.customers.phone, real)).catch(() => {});
        }
        await setCustomerCookie(real).catch(() => {});
        phone = real;
        linked = true;
      }
    }
  }

  if (!phone) {
    // مسجّل بإيميل/Google بلا رقم بعد — نرجّع إيميله واسماً مشتقاً منه
    // حتى يظهرا بالحساب ويُملآ بالطلب (الرقم يُطلب عند الطلب فقط)
    return NextResponse.json({
      guest: true,
      googleSession: !!authUser,
      linked: false,
      email: authUser?.email ?? null,
      name: authUser?.email ? nameFromEmail(authUser.email) : null,
    });
  }
  let balance = 0;
  await db.transaction(async (tx) => {
    balance = (await settleLoyalty(tx, phone)).balance;
  });
  const [c] = await db.select().from(s.customers).where(eq(s.customers.phone, phone));
  if (!c) return NextResponse.json({ guest: true });
  const orders = await db
    .select({
      orderNumber: s.orders.orderNumber, status: s.orders.status,
      total: s.orders.total, createdAt: s.orders.createdAt, id: s.orders.id,
    })
    .from(s.orders)
    .where(eq(s.orders.customerPhone, phone))
    .orderBy(desc(s.orders.createdAt))
    .limit(10);

  // منتجات كل طلب (لإعادة الطلب) — القابلة فقط (لها product_id ووزن/سعر)
  const orderIds = orders.map((o) => o.id);
  let itemsByOrder: Record<number, { productId: number | null; slug: string | null; name: string; variant: string; qty: number }[]> = {};
  if (orderIds.length > 0) {
    const allItems = await db
      .select({
        orderId: s.orderItems.orderId, productId: s.orderItems.productId,
        slug: s.products.slug,
        name: s.orderItems.nameSnapshot, variant: s.orderItems.variant, qty: s.orderItems.qty,
      })
      .from(s.orderItems)
      .leftJoin(s.products, eq(s.products.id, s.orderItems.productId))
      .where(inArray(s.orderItems.orderId, orderIds));
    itemsByOrder = allItems.reduce((acc, it) => {
      (acc[it.orderId] ??= []).push({ productId: it.productId, slug: it.slug, name: it.name, variant: it.variant, qty: it.qty });
      return acc;
    }, {} as typeof itemsByOrder);
  }
  const ordersWithItems = orders.map((o) => ({
    orderNumber: o.orderNumber, status: o.status, total: o.total, createdAt: o.createdAt,
    items: itemsByOrder[o.id] ?? [],
  }));
  // لو إيميل/اسم الزبون فارغ بالجدول لكن عنده حساب مصادقة بإيميل → نستخدم إيميل المصادقة
  const effectiveEmail = c.email || authUser?.email || null;
  const effectiveName = (c.name && c.name !== "زبون خزف")
    ? c.name
    : (authUser?.email ? nameFromEmail(authUser.email) : c.name);
  return NextResponse.json({
    googleSession: !!authUser, linked, hasAuth: !!c.authUserId,
    phone: c.phone, name: effectiveName, email: effectiveEmail, governorate: c.governorate, address: c.address,
    pointsBalance: balance, pointsValueDinars: balance * (await getSettings()).pointValue,
    journeyOrders: c.journeyOrders, journeyActive: c.journeyActive,
    journeyLevels: (await db.select({ level: s.journeyLevels.level, rewardType: s.journeyLevels.rewardType, value: s.journeyLevels.value, giftName: s.journeyLevels.giftName }).from(s.journeyLevels).orderBy(asc(s.journeyLevels.level))),
    orders: ordersWithItems,
  });
}
