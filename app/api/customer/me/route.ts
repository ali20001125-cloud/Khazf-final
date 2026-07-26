import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getCustomerIdentity } from "@/lib/server/customer-identity";
import { getSettings } from "@/lib/server/settings";
import { asc } from "drizzle-orm";
import { settleLoyalty } from "@/lib/server/loyalty";

export const runtime = "nodejs";

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
  const { phone, authUser, linked } = await getCustomerIdentity();
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
      total: s.orders.total, createdAt: s.orders.createdAt,
    })
    .from(s.orders)
    .where(eq(s.orders.customerPhone, phone))
    .orderBy(desc(s.orders.createdAt))
    .limit(10);
  return NextResponse.json({
    googleSession: !!authUser, linked, hasAuth: !!c.authUserId,
    phone: c.phone, name: c.name, email: c.email, governorate: c.governorate, address: c.address,
    pointsBalance: balance, pointsValueDinars: balance * (await getSettings()).pointValue,
    journeyOrders: c.journeyOrders, journeyActive: c.journeyActive,
    journeyLevels: (await db.select({ level: s.journeyLevels.level, rewardType: s.journeyLevels.rewardType, value: s.journeyLevels.value, giftName: s.journeyLevels.giftName }).from(s.journeyLevels).orderBy(asc(s.journeyLevels.level))),
    orders,
  });
}
