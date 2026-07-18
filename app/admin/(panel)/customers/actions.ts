"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { flashSaved } from "@/lib/server/flash";

export async function saveNotes(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const phone = String(f.get("phone"));
  await db.update(s.customers).set({ adminNotes: String(f.get("notes") ?? "").trim() || null })
    .where(eq(s.customers.phone, phone));
  revalidatePath(`/admin/customers/${phone}`);
}

/** نقاط يدوية ± (قيد MANUAL — السجل مصدر الحقيقة) */
export async function manualPoints(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const phone = String(f.get("phone"));
  const pts = Math.round(Number(f.get("points")));
  const note = String(f.get("note") ?? "").trim() || "تعديل إداري";
  if (!pts) return;
  await db.transaction(async (tx) => {
    await tx.insert(s.cashbackLedger).values({
      customerPhone: phone, type: pts > 0 ? "MANUAL" : "USE",
      points: Math.abs(pts), note: `${note} (إداري)`,
    });
    await tx.update(s.customers)
      .set({ pointsBalance: sql`GREATEST(points_balance + ${pts}, 0)` })
      .where(eq(s.customers.phone, phone));
  });
  revalidatePath(`/admin/customers/${phone}`);
}

export async function toggleJourney(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const phone = String(f.get("phone"));
  const [c] = await db.select({ a: s.customers.journeyActive }).from(s.customers).where(eq(s.customers.phone, phone));
  await db.update(s.customers).set({ journeyActive: !c.a }).where(eq(s.customers.phone, phone));
  revalidatePath(`/admin/customers/${phone}`);
}
