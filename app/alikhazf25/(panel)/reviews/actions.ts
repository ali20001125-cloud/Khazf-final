"use server";
import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/server/catalog";
import { invalidateSettings } from "@/lib/server/settings";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { flashSaved } from "@/lib/server/flash";

export async function setReviewStatus(f: FormData) {
  await requireAdmin();
  await flashSaved();
  await db.update(s.reviews).set({
    status: String(f.get("status")) as "PENDING" | "PUBLISHED" | "HIDDEN",
  }).where(eq(s.reviews.id, Number(f.get("id"))));
  revalidatePath("/alikhazf25/reviews"); invalidateCatalog(); invalidateSettings(); revalidatePath("/");
}

export async function replyReview(f: FormData) {
  await requireAdmin();
  await flashSaved();
  await db.update(s.reviews).set({ reply: String(f.get("reply") ?? "").trim() || null })
    .where(eq(s.reviews.id, Number(f.get("id"))));
  revalidatePath("/alikhazf25/reviews"); invalidateCatalog(); invalidateSettings(); revalidatePath("/");
}
