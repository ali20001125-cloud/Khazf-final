import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { emailRestock } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * إشعار عودة المنتجات: من ترك بريده لمنتج نافد يُعلَم حين يتوفّر.
 *   GET /api/cron/restock?key=CRON_SECRET
 * يُشغَّل مع مهمة التذكير (كل ساعة).
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const site = process.env.SITE_URL ?? "https://khazf.shop";

  /* المنتجات التي عادت للتوفّر ولها بريد بانتظارها:
     القهوة رصيدها من الوجبات (غرام) · الأدوات من الخيارات أو المخزون العام */
  const rows = (await db.execute(sql`
    SELECT l.id, l.email, p.slug, p.name, p.type
    FROM email_leads l
    JOIN products p ON p.slug = l.product_slug
    WHERE l.source = 'restock'
      AND l.notified = false
      AND p.active = true
      AND (
        CASE WHEN p.type = 'COFFEE'
          THEN COALESCE((SELECT SUM(qty_remaining) FROM inventory_batches b WHERE b.product_id = p.id), 0) >= 250
          ELSE COALESCE((SELECT SUM(stock) FROM product_variants v WHERE v.product_id = p.id AND v.active), 0)
             + COALESCE(p.stock_pieces, 0)
             + COALESCE((SELECT SUM(qty_remaining) FROM inventory_batches b WHERE b.product_id = p.id), 0) >= 1
        END
      )
    LIMIT 40`)).rows as unknown as
    { id: number; email: string; slug: string; name: string; type: string }[];

  let sent = 0;
  for (const r of rows) {
    const param = r.type === "COFFEE" ? "c" : "t";
    try {
      await emailRestock({
        email: r.email,
        productName: r.name,
        url: `${site}/product/?${param}=${r.slug}`,
      });
      await db.update(s.emailLeads).set({ notified: true })
        .where(and(eq(s.emailLeads.id, r.id), eq(s.emailLeads.notified, false)));
      sent++;
    } catch { /* نتجاوز ونكمل */ }
  }

  return NextResponse.json({ ok: true, due: rows.length, sent });
}
