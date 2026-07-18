/**
 * الولاء — تسوية الرصيد وانتهاء الصلاحية
 * الرصيد الحقيقي = سجل ledger؛ pointsBalance كاش يُحدَّث هنا داخل نفس الـTransaction
 */
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import type { DB } from "./db";
import { schema as s } from "./db";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** يسوّي رصيد الزبون: EARN المتاحة − USE − EXPIRE + MANUAL، ويطبّق انتهاء الصلاحية إن حلّ */
export async function settleLoyalty(tx: Tx, phone: string) {
  const [customer] = await tx.select().from(s.customers).where(eq(s.customers.phone, phone)).for("update");
  if (!customer) return { balance: 0, customer: null };

  const now = new Date();

  /* انتهاء الصلاحية (٣ شهور من آخر طلب): يسقط الرصيد وتُصفَّر الرحلة — دورة جديدة */
  if (customer.loyaltyExpiresAt && customer.loyaltyExpiresAt < now) {
    const cur = await currentBalance(tx, phone, now);
    if (cur > 0)
      await tx.insert(s.cashbackLedger).values({
        customerPhone: phone,
        type: "EXPIRE",
        points: cur,
        note: "انتهاء صلاحية ٩٠ يوم",
      });
    await tx
      .update(s.customers)
      .set({ pointsBalance: 0, journeyOrders: 0, journeyActive: true, loyaltyExpiresAt: null })
      .where(eq(s.customers.phone, phone));
    const [fresh] = await tx.select().from(s.customers).where(eq(s.customers.phone, phone));
    return { balance: 0, customer: fresh };
  }

  const balance = await currentBalance(tx, phone, now);
  if (balance !== customer.pointsBalance)
    await tx.update(s.customers).set({ pointsBalance: balance }).where(eq(s.customers.phone, phone));
  return { balance, customer: { ...customer, pointsBalance: balance } };
}

async function currentBalance(tx: Tx, phone: string, now: Date) {
  const earned = await tx
    .select({ v: sql<number>`COALESCE(SUM(points),0)::int` })
    .from(s.cashbackLedger)
    .where(
      and(
        eq(s.cashbackLedger.customerPhone, phone),
        eq(s.cashbackLedger.type, "EARN"),
        isNotNull(s.cashbackLedger.availableAt),
        lte(s.cashbackLedger.availableAt, now)
      )
    );
  const manual = await sumType(tx, phone, "MANUAL");
  const used = await sumType(tx, phone, "USE");
  const expired = await sumType(tx, phone, "EXPIRE");
  return Math.max(0, earned[0].v + manual - used - expired);
}

async function sumType(tx: Tx, phone: string, type: "USE" | "EXPIRE" | "MANUAL") {
  const r = await tx
    .select({ v: sql<number>`COALESCE(SUM(points),0)::int` })
    .from(s.cashbackLedger)
    .where(and(eq(s.cashbackLedger.customerPhone, phone), eq(s.cashbackLedger.type, type)));
  return r[0].v;
}
