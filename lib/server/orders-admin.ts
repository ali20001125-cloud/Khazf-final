/** عمليات الإدارة على الطلبات: توصيل (يفتح كسب النقاط بعد ٤٨سا) + إلغاء (يرجّع كل شيء) */
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "./db";

export async function deliverOrder(orderId: number) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
    if (!o) throw new Error("الطلب غير موجود");
    if (o.status !== "CONFIRMED") throw new Error("الطلب ليس بحالة تأكيد");
    const deliveredAt = new Date();
    await tx.update(s.orders).set({ status: "DELIVERED", deliveredAt }).where(eq(s.orders.id, orderId));
    if (o.pointsEarned > 0)
      await tx.insert(s.cashbackLedger).values({
        customerPhone: o.customerPhone,
        orderId,
        type: "EARN",
        points: o.pointsEarned,
        availableAt: deliveredAt, // تتفعّل فوراً مع التوصيل
        note: o.orderNumber,
      });
    return { ok: true };
  });
}

export async function cancelOrder(orderId: number) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
    if (!o) throw new Error("الطلب غير موجود");
    if (o.status !== "CONFIRMED") throw new Error("لا يُلغى إلا طلب بحالة تأكيد");

    const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));

    /* إرجاع المخزون لنفس الوجبات (من batchBreakdown) */
    for (const it of items) {
      const bd = (it.batchBreakdown ?? []) as { batchId: number; qty: number }[];
      let restored = 0;
      for (const b of bd) {
        await tx
          .update(s.inventoryBatches)
          .set({ qtyRemaining: sql`qty_remaining + ${b.qty}` })
          .where(eq(s.inventoryBatches.id, b.batchId));
        restored += b.qty;
      }
      if (restored > 0 && it.productId)
        await tx.insert(s.inventoryMovements).values({
          productId: it.productId,
          type: "CANCEL_RETURN",
          qtyDelta: restored,
          orderId,
          reason: `إلغاء ${o.orderNumber}`,
        });
    }

    /* إرجاع النقاط المستخدمة (قيد تعويضي — السجل لا يُحذف) */
    if (o.pointsUsed > 0) {
      const [settings] = await tx.select().from(s.settings).where(eq(s.settings.id, 1));
      const pts = Math.round(o.pointsUsed / settings.pointValue);
      await tx.insert(s.cashbackLedger).values({
        customerPhone: o.customerPhone, orderId, type: "MANUAL",
        points: pts, note: `إرجاع نقاط — إلغاء ${o.orderNumber}`,
      });
      await tx
        .update(s.customers)
        .set({ pointsBalance: sql`points_balance + ${pts}` })
        .where(eq(s.customers.phone, o.customerPhone));
    }

    /* تراجع الكود والرحلة */
    if (o.couponCode) {
      await tx.update(s.coupons).set({ usedCount: sql`GREATEST(used_count - 1, 0)` }).where(eq(s.coupons.code, o.couponCode));
      await tx.delete(s.couponUsages).where(and(eq(s.couponUsages.orderId, orderId), eq(s.couponUsages.couponCode, o.couponCode)));
    }
    await tx
      .update(s.customers)
      .set({ journeyOrders: sql`GREATEST(journey_orders - 1, 0)`, journeyActive: true })
      .where(eq(s.customers.phone, o.customerPhone));

    await tx.update(s.orders).set({ status: "CANCELLED", cancelledAt: new Date() }).where(eq(s.orders.id, orderId));
    return { ok: true };
  });
}
