"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";

/** إضافة وجبة استلام (قهوة: تكاليف/كيلو · أداة: تكلفة/قطعة) */
export async function addBatch(f: FormData) {
  await requireAdmin();
  const productId = Number(f.get("productId"));
  const qty = Math.round(Number(f.get("qty")));
  if (!productId || !qty || qty <= 0) throw new Error("بيانات ناقصة");
  const n = (k: string) => {
    const v = Number(String(f.get(k) ?? "").trim());
    return Number.isFinite(v) && String(f.get(k)).trim() !== "" ? Math.round(v) : null;
  };
  await db.transaction(async (tx) => {
    const [b] = await tx.insert(s.inventoryBatches).values({
      productId, qtyReceived: qty, qtyRemaining: qty,
      importCostPerKilo: n("importCost"), shipCostPerKilo: n("shipCost"),
      packCostPerKilo: n("packCost"), costPerPiece: n("costPerPiece"),
      note: String(f.get("note") ?? "").trim() || null,
    }).returning({ id: s.inventoryBatches.id });
    await tx.insert(s.inventoryMovements).values({
      productId, batchId: b.id, type: "IN", qtyDelta: qty, reason: "وجبة جديدة",
    });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/");
}

/** تعديل يدوي: موجب = وجبة تصحيح بلا تكلفة · سالب = خصم FIFO */
export async function adjustStock(f: FormData) {
  await requireAdmin();
  const productId = Number(f.get("productId"));
  const delta = Math.round(Number(f.get("delta")));
  const reason = String(f.get("reason") ?? "").trim() || "تعديل يدوي";
  if (!productId || !delta) throw new Error("بيانات ناقصة");

  await db.transaction(async (tx) => {
    if (delta > 0) {
      const [b] = await tx.insert(s.inventoryBatches).values({
        productId, qtyReceived: delta, qtyRemaining: delta, note: `تصحيح: ${reason}`,
      }).returning({ id: s.inventoryBatches.id });
      await tx.insert(s.inventoryMovements).values({ productId, batchId: b.id, type: "ADJUSTMENT", qtyDelta: delta, reason });
    } else {
      let need = -delta;
      const batches = await tx.select().from(s.inventoryBatches)
        .where(eq(s.inventoryBatches.productId, productId))
        .orderBy(asc(s.inventoryBatches.receivedAt)).for("update");
      for (const b of batches) {
        if (need <= 0) break;
        const take = Math.min(need, b.qtyRemaining);
        if (take > 0) {
          await tx.update(s.inventoryBatches).set({ qtyRemaining: b.qtyRemaining - take }).where(eq(s.inventoryBatches.id, b.id));
          need -= take;
        }
      }
      if (need > 0) throw new Error("الرصيد أقل من المطلوب خصمه");
      await tx.insert(s.inventoryMovements).values({ productId, type: "ADJUSTMENT", qtyDelta: delta, reason });
    }
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/");
}
