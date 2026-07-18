"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";

export async function saveLevel(f: FormData) {
  await requireAdmin();
  const level = Number(f.get("level"));
  await db.update(s.journeyLevels).set({
    rewardType: String(f.get("rewardType")) as "PERCENT" | "FIXED" | "FREE_DELIVERY" | "GIFT",
    value: Math.round(Number(f.get("value") || 0)),
    giftName: String(f.get("giftName") ?? "").trim() || null,
    active: f.get("active") === "on",
  }).where(eq(s.journeyLevels.level, level));
  revalidatePath("/admin/loyalty");
}

export async function addGift(f: FormData) {
  await requireAdmin();
  const name = String(f.get("name") ?? "").trim();
  if (name) await db.insert(s.boxGifts).values({ name });
  revalidatePath("/admin/loyalty"); revalidatePath("/");
}

export async function toggleGift(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id"));
  const [g] = await db.select({ a: s.boxGifts.active }).from(s.boxGifts).where(eq(s.boxGifts.id, id));
  await db.update(s.boxGifts).set({ active: !g.a }).where(eq(s.boxGifts.id, id));
  revalidatePath("/admin/loyalty"); revalidatePath("/");
}
