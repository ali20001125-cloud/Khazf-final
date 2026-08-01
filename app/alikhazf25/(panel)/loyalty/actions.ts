"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { flashSaved } from "@/lib/server/flash";

export async function saveLevel(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const level = Number(f.get("level"));
  await db.update(s.journeyLevels).set({
    rewardType: String(f.get("rewardType")) as "PERCENT" | "FIXED" | "FREE_DELIVERY" | "GIFT",
    value: Math.round(Number(f.get("value") || 0)),
    giftName: String(f.get("giftName") ?? "").trim() || null,
    active: f.get("active") === "on",
  }).where(eq(s.journeyLevels.level, level));
  revalidatePath("/alikhazf25/loyalty");
}

export async function addGift(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const productId = Number(f.get("productId")) || null;
  let name = String(f.get("name") ?? "").trim();
  const note = String(f.get("note") ?? "").trim() || null;
  // لو اختير منتج ولم يُكتب اسم، نأخذ اسم المنتج
  if (productId && !name) {
    const [p] = await db.select({ n: s.products.name }).from(s.products).where(eq(s.products.id, productId));
    name = p?.n ?? "";
  }
  if (name) await db.insert(s.boxGifts).values({ name, productId, note });
  revalidatePath("/alikhazf25/loyalty"); revalidatePath("/");
}

export async function toggleGift(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const id = Number(f.get("id"));
  const [g] = await db.select({ a: s.boxGifts.active }).from(s.boxGifts).where(eq(s.boxGifts.id, id));
  await db.update(s.boxGifts).set({ active: !g.a }).where(eq(s.boxGifts.id, id));
  revalidatePath("/alikhazf25/loyalty"); revalidatePath("/");
}
