"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { flashSaved } from "@/lib/server/flash";
import { toNum } from "@/lib/num";

/**
 * وجبة شحنة — منطق علي:
 * تدخل كل منتج بالكيلو + سعر استيراده للكيلو، وتوصيل الشحنة الإجمالي + تغليف/كيلو
 * → التوصيل يتوزع تلقائياً على مجموع الكيلوات، والتخزين بالغرام داخلياً
 */
export async function addShipment(f: FormData) {
  await requireAdmin();
  try {
  const packPerKilo = Math.round(toNum(f.get("packPerKilo")) || 0);
  const shipTotal = Math.round(toNum(f.get("shipTotal")) || 0);
  const note = String(f.get("note") ?? "").trim() || null;
  const rows: { productId: number; kg: number; importPerKilo: number }[] = [];
  for (let i = 1; i <= 4; i++) {
    const productId = Number(f.get(`p${i}_product`));
    const kg = toNum(f.get(`p${i}_kg`));
    const imp = Math.round(toNum(f.get(`p${i}_import`)) || 0);
    if (productId && kg > 0) rows.push({ productId, kg, importPerKilo: imp });
  }
  if (!rows.length || rows.some((r) => !Number.isFinite(r.kg))) {
    await flashSaved("⚠️ أدخل محصولاً واحداً على الأقل مع كميته بالكيلو");
    return;
  }
  const totalKg = rows.reduce((t, r) => t + r.kg, 0);
  const shipPerKilo = totalKg > 0 ? Math.round(shipTotal / totalKg) : 0;

  await flashSaved(`أُضيفت الشحنة ✓ (${totalKg} كغ · توصيل ${shipPerKilo.toLocaleString("en")}/كغ)`);
  await db.transaction(async (tx) => {
    for (const r of rows) {
      const grams = Math.round(r.kg * 1000);
      const [b] = await tx.insert(s.inventoryBatches).values({
        productId: r.productId, qtyReceived: grams, qtyRemaining: grams,
        importCostPerKilo: r.importPerKilo, shipCostPerKilo: shipPerKilo,
        packCostPerKilo: packPerKilo, note,
      }).returning({ id: s.inventoryBatches.id });
      await tx.insert(s.inventoryMovements).values({
        productId: r.productId, batchId: b.id, type: "IN", qtyDelta: grams, reason: "شحنة جديدة",
      });
    }
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  } catch (e) { await flashSaved("⚠️ " + (e instanceof Error ? e.message : "خطأ غير متوقع")); }
}

/** أداة واحدة (بالقطعة) — منفصلة تماماً عن شحنات القهوة */
export async function addToolBatch(f: FormData) {
  await requireAdmin();
  try {
  await flashSaved();
  const productId = Number(f.get("productId"));
  const qty = Math.round(toNum(f.get("qty")));
  const cost = Math.round(toNum(f.get("costPerPiece")) || 0);
  if (!productId || !Number.isFinite(qty) || qty <= 0) { await flashSaved("⚠️ بيانات ناقصة"); return; }
  await db.transaction(async (tx) => {
    const [b] = await tx.insert(s.inventoryBatches).values({
      productId, qtyReceived: qty, qtyRemaining: qty, costPerPiece: cost,
    }).returning({ id: s.inventoryBatches.id });
    await tx.insert(s.inventoryMovements).values({ productId, batchId: b.id, type: "IN", qtyDelta: qty, reason: "أدوات" });
  });
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  } catch (e) { await flashSaved("⚠️ " + (e instanceof Error ? e.message : "خطأ غير متوقع")); }
}

/** تعديل يدوي بالأكياس (كيس=٢٥٠غ) للقهوة، وبالقطعة للأدوات */
export async function adjustStock(f: FormData) {
  await requireAdmin();
  try {
  await flashSaved();
  const [pid, unit] = String(f.get("productKey") ?? "").split("|");
  const productId = Number(pid);
  const raw = Math.round(toNum(f.get("delta")));
  const delta = unit === "COFFEE" ? raw * 250 : raw;
  const reason = String(f.get("reason") ?? "").trim() || "تعديل يدوي";
  if (!productId || !Number.isFinite(delta) || !delta) { await flashSaved("⚠️ بيانات ناقصة"); return; }

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
  } catch (e) { await flashSaved("⚠️ " + (e instanceof Error ? e.message : "خطأ غير متوقع")); }
}
