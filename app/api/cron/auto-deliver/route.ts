import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { deliverOrder } from "@/lib/server/orders-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * توصيل تلقائي: الطلبات المؤكّدة التي مضى عليها ٧٢ ساعة ولم تُحدَّث يدوياً
 * تُعلَّم «تم التوصيل» — فيُفعَّل الكاش باك ويُرسل طلب التقييم.
 *   GET /api/cron/auto-deliver?key=CRON_SECRET
 * يُشغَّل مع مهمة التذكير (كل ساعة) أو يومياً.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);
  const due = await db
    .select({ id: s.orders.id, orderNumber: s.orders.orderNumber })
    .from(s.orders)
    .where(and(eq(s.orders.status, "CONFIRMED"), lt(s.orders.createdAt, cutoff)))
    .limit(30);

  let delivered = 0;
  const failed: string[] = [];
  for (const o of due) {
    try { await deliverOrder(o.id); delivered++; }
    catch { failed.push(o.orderNumber); }
  }

  return NextResponse.json({ ok: true, due: due.length, delivered, failed });
}
