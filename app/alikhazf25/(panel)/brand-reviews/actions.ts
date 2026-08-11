"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { invalidateCatalog } from "@/lib/server/catalog";
import { requireAdmin } from "@/lib/server/admin-guard";

export async function saveBrandReview(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id") ?? 0);
  const data = {
    quote: String(f.get("quote") ?? "").trim(),
    author: String(f.get("author") ?? "").trim() || null,
    context: String(f.get("context") ?? "").trim() || null,
    rating: Math.min(5, Math.max(1, Number(f.get("rating") ?? 5))),
    sort: Number(f.get("sort") ?? 0),
    active: f.get("active") === "on",
  };
  if (!data.quote) return;
  if (id > 0) await db.update(s.brandReviews).set(data).where(eq(s.brandReviews.id, id));
  else await db.insert(s.brandReviews).values(data);
  invalidateCatalog();
  revalidatePath("/");
  revalidatePath("/alikhazf25/brand-reviews");
}

export async function deleteBrandReview(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id") ?? 0);
  if (id > 0) await db.delete(s.brandReviews).where(eq(s.brandReviews.id, id));
  invalidateCatalog();
  revalidatePath("/");
  revalidatePath("/alikhazf25/brand-reviews");
}
