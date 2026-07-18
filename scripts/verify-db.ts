/** فحص شامل: العدّ + رصيد FIFO + تجربة Transaction بيع مع تراجع */
import "dotenv/config";
import { db, schema as s } from "../lib/server/db";
import { sql, eq, asc } from "drizzle-orm";

async function main() {
  const count = async (t: string) =>
    Number((await db.execute(sql.raw(`SELECT count(*) c FROM ${t}`))).rows[0].c);

  console.log("── العدّ ──");
  for (const t of ["places","subcategories","products","product_places","journey_levels","box_gifts","banners","settings","settings_internal"])
    console.log(`  ${t}: ${await count(t)}`);

  console.log("── رصيد المخزون (محسوب من الوجبات) ──");
  const stocks = await db.execute(sql`
    SELECT p.name, COALESCE(SUM(b.qty_remaining),0)::int AS grams
    FROM products p LEFT JOIN inventory_batches b ON b.product_id = p.id
    WHERE p.type='COFFEE' GROUP BY p.name ORDER BY p.name`);
  for (const r of stocks.rows) console.log(`  ${r.name}: ${r.grams} غ`);

  console.log("── تجربة Transaction: بيع ٢٥٠غ كالدي FIFO ثم تراجع ──");
  const [kaldi] = await db.select().from(s.products).where(eq(s.products.slug, "kaldi"));
  try {
    await db.transaction(async (tx) => {
      const batches = await tx
        .select()
        .from(s.inventoryBatches)
        .where(eq(s.inventoryBatches.productId, kaldi.id))
        .orderBy(asc(s.inventoryBatches.receivedAt))
        .for("update"); // قفل صفوف — منع البيع الزائد
      let need = 250;
      for (const b of batches) {
        if (need <= 0) break;
        const take = Math.min(need, b.qtyRemaining);
        if (take > 0) {
          await tx
            .update(s.inventoryBatches)
            .set({ qtyRemaining: b.qtyRemaining - take })
            .where(eq(s.inventoryBatches.id, b.id));
          need -= take;
        }
      }
      if (need > 0) throw new Error("مخزون غير كافٍ — الطلب يُلغى بالكامل");
      const after = await tx.execute(
        sql`SELECT COALESCE(SUM(qty_remaining),0)::int g FROM inventory_batches WHERE product_id=${kaldi.id}`
      );
      console.log(`  داخل الـTx بعد الخصم: ${after.rows[0].g} غ`);
      throw new Error("__ROLLBACK_TEST__");
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "__ROLLBACK_TEST__") console.log("  ↩ تراجع مقصود");
    else console.log(`  ⚠ ${msg}`);
  }
  const final = await db.execute(
    sql`SELECT COALESCE(SUM(qty_remaining),0)::int g FROM inventory_batches WHERE product_id=${kaldi.id}`
  );
  console.log(`  بعد التراجع: ${final.rows[0].g} غ (يجب أن يساوي ما قبل التجربة)`);

  console.log("✓ الفحص اكتمل");
  process.exit(0);
}
main().catch((e) => { console.error("✗", e); process.exit(1); });
