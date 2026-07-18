/**
 * ⚠️ مخزون تجريبي للاختبار فقط — لا يُشغَّل بالإنتاج
 * يضيف وجبة واحدة لكل محصول (٥ كيلو) بتكاليف مثال، عبر نفس مسار الوجبات+الحركات
 */
import "dotenv/config";
import { db, schema as s } from "../lib/server/db";
import { eq } from "drizzle-orm";

async function main() {
  const coffees = await db.select().from(s.products).where(eq(s.products.type, "COFFEE"));
  await db.transaction(async (tx) => {
    for (const c of coffees) {
      const [b] = await tx
        .insert(s.inventoryBatches)
        .values({
          productId: c.id,
          qtyReceived: 5000,
          qtyRemaining: 5000,
          importCostPerKilo: 60000,
          shipCostPerKilo: 4000,
          packCostPerKilo: 4000,
          note: "وجبة تجريبية (demo)",
        })
        .returning({ id: s.inventoryBatches.id });
      await tx.insert(s.inventoryMovements).values({
        productId: c.id,
        batchId: b.id,
        type: "IN",
        qtyDelta: 5000,
        reason: "وجبة تجريبية",
      });
    }
  });
  console.log(`✓ أُضيفت وجبة ٥٠٠٠غ لكل محصول (${coffees.length})`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
