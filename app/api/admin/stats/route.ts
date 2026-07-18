import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { getAdmin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = async (x: string) => Number((await db.execute(sql.raw(x))).rows[0].v ?? 0);
  return NextResponse.json({
    pending: await q(`SELECT count(*) v FROM orders WHERE status='CONFIRMED'`),
    pendingReviews: await q(`SELECT count(*) v FROM reviews WHERE status='PENDING'`),
    lowStock: await q(`SELECT count(*) v FROM (
      SELECT p.id FROM products p LEFT JOIN inventory_batches b ON b.product_id=p.id
      WHERE p.active GROUP BY p.id, p.stock_threshold
      HAVING COALESCE(SUM(b.qty_remaining),0) <= p.stock_threshold) x`),
  });
}
