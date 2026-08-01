import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { emailNewProduct } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * إعلان المنتجات الجديدة لقائمة البريد.
 *   GET /api/cron/announce?key=CRON_SECRET
 * يُرسل مرة واحدة لكل منتج مُعلَّم بـannounce، ثم يُطفأ العَلَم.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const site = process.env.SITE_URL ?? "https://khazf.shop";

  const pending = (await db.execute(sql`
    SELECT p.id, p.slug, p.name, p.type, p.description, p.images,
           COALESCE(p.sale_price, p.price_piece, p.price_g250) AS price
    FROM products p
    WHERE p.announce = true AND p.active = true
      AND NOT EXISTS (SELECT 1 FROM lead_broadcasts b WHERE b.product_id = p.id)
    LIMIT 3`)).rows as unknown as
    { id: number; slug: string; name: string; type: string; description: string | null;
      images: string[] | null; price: number | null }[];

  if (pending.length === 0) return NextResponse.json({ ok: true, announced: 0 });

  // قائمة البريد + الزبائن الموافقون على التسويق
  const audience = (await db.execute(sql`
    SELECT DISTINCT lower(email) AS email FROM (
      SELECT email FROM email_leads WHERE email IS NOT NULL
      UNION
      SELECT email FROM customers WHERE email IS NOT NULL AND marketing_opt_in = true
    ) t`)).rows as unknown as { email: string }[];

  let total = 0;
  for (const p of pending) {
    const param = p.type === "COFFEE" ? "c" : "t";
    let sent = 0;
    // حدّ أمان لبريد الاستضافة (١٠٠/يوم)
    for (const a of audience.slice(0, 60)) {
      try {
        await emailNewProduct({
          email: a.email, productName: p.name,
          url: `${site}/product/?${param}=${p.slug}`,
          image: p.images?.[0] ?? null,
          note: p.description, price: p.price,
        });
        sent++;
      } catch { /* نكمل */ }
    }
    await db.execute(sql`INSERT INTO lead_broadcasts (product_id, sent_count) VALUES (${p.id}, ${sent})
      ON CONFLICT (product_id) DO NOTHING`);
    await db.execute(sql`UPDATE products SET announce = false WHERE id = ${p.id}`);
    total += sent;
  }

  return NextResponse.json({ ok: true, announced: pending.length, emails: total });
}
