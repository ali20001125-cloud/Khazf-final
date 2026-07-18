"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";

export async function createCoupon(f: FormData) {
  await requireAdmin();
  const n = (k: string) => { const v = Number(String(f.get(k) ?? "").trim()); return Number.isFinite(v) && String(f.get(k)).trim() !== "" ? Math.round(v) : null; };
  const exp = String(f.get("expiresAt") ?? "").trim();
  await db.insert(s.coupons).values({
    code: String(f.get("code")).trim().toUpperCase(),
    type: String(f.get("type")) as "PERCENT" | "FIXED" | "FREE_DELIVERY",
    value: n("value") ?? 0,
    expiresAt: exp ? new Date(exp) : null,
    usageLimit: n("usageLimit"),
    perCustomerLimit: n("perCustomerLimit"),
    targetPhone: String(f.get("targetPhone") ?? "").trim() || null,
  }).onConflictDoNothing();
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(f: FormData) {
  await requireAdmin();
  const code = String(f.get("code"));
  const [c] = await db.select({ a: s.coupons.active }).from(s.coupons).where(eq(s.coupons.code, code));
  await db.update(s.coupons).set({ active: !c.a }).where(eq(s.coupons.code, code));
  revalidatePath("/admin/coupons");
}
