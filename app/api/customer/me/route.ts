import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getCustomerIdentity } from "@/lib/server/customer-identity";
import { getSettings } from "@/lib/server/settings";
import { asc } from "drizzle-orm";
import { settleLoyalty } from "@/lib/server/loyalty";

export const runtime = "nodejs";

export async function GET() {
  const { phone, authUser, linked } = await getCustomerIdentity();
  if (!phone) return NextResponse.json({ guest: true, googleSession: !!authUser, linked: false });
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
