/** الرصيد محسوب من الوجبات — لا حقل مخزون على المنتج (الدستور) */
import { sql } from "drizzle-orm";
import { db } from "./db";

/** خريطة productId → الرصيد (غرام للقهوة، قطعة للأدوات) */
export async function getStockMap(productIds?: number[]) {
  const filter = productIds?.length
    ? sql`WHERE product_id IN (${sql.join(productIds.map((i) => sql`${i}`), sql`, `)})`
    : sql``;
  const res = await db.execute(sql`
    SELECT product_id, COALESCE(SUM(qty_remaining), 0)::int AS qty
    FROM inventory_batches ${filter}
    GROUP BY product_id
  `);
  const map = new Map<number, number>();
  for (const r of res.rows as { product_id: number; qty: number }[]) map.set(r.product_id, r.qty);
  return map;
}
