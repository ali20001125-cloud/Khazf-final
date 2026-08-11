import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { emailBrewTips } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * وصفات المحاصيل — تُرسل بعد يومين من التوصيل، حين يكون قد فتح الكيس فعلاً.
 *   GET /api/cron/brew-tips?key=CRON_SECRET
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  /* طلبات موصَّلة منذ يومين إلى أربعة، لها بريد، ولم تُرسل لها الوصفات بعد */
  const orders = (await db.execute(sql`
    SELECT o.id, o.email, o.name
    FROM orders o
    WHERE o.status = 'DELIVERED'
      AND o.email IS NOT NULL
      AND o.delivered_at <= now() - interval '2 days'
      AND o.delivered_at > now() - interval '30 days'   -- نافذة أوسع: لا تسقط الطلبات إن تعطّل الكرون يوماً
      AND NOT EXISTS (
        SELECT 1 FROM email_log l
        WHERE l.kind = 'brew_tips' AND lower(l.recipient) = lower(o.email)
          AND l.created_at > o.delivered_at
      )
    LIMIT 25`)).rows as unknown as { id: number; email: string; name: string }[];

  let sent = 0;
  for (const o of orders) {
    const coffees = (await db.execute(sql`
      SELECT DISTINCT p.name, p.notes, p.roast, p.brew
      FROM order_items i JOIN products p ON p.id = i.product_id
      WHERE i.order_id = ${o.id} AND p.type = 'COFFEE'`)).rows as unknown as
      { name: string; notes: string[] | null; roast: string | null; brew: { name: string; nums: string }[] | null }[];

    if (coffees.length === 0) continue;

    const DEFAULT_BREW = [
      { name: "V60", nums: "٢٠غ · ٣٠٠مل · ٩٢° · ٢:٤٥" },
      { name: "كيمكس", nums: "٣٠غ · ٤٥٠مل · ٩٣° · ٤:٠٠" },
    ];

    try {
      await emailBrewTips({
        email: o.email, name: o.name || "صديق خزف",
        coffees: coffees.map((c) => ({
          name: c.name,
          notes: c.notes ?? [],
          roast: c.roast,
          brew: c.brew && c.brew.length > 0 ? c.brew : DEFAULT_BREW,
        })),
      });
      sent++;
    } catch { /* نكمل */ }
  }

  return NextResponse.json({ ok: true, due: orders.length, sent });
}
