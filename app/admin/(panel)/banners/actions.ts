"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { flashSaved } from "@/lib/server/flash";

export async function addBanner(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const text = String(f.get("text") ?? "").trim();
  if (!text) return;
  await db.insert(s.banners).values({
    text,
    promoText: String(f.get("promoText") ?? "").trim() || null,
    promoLink: String(f.get("promoLink") ?? "").trim() || null,
    sort: Math.round(Number(f.get("sort") || 0)),
  });
  revalidatePath("/admin/banners");
}

export async function toggleBanner(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const id = Number(f.get("id"));
  const [b] = await db.select({ a: s.banners.active }).from(s.banners).where(eq(s.banners.id, id));
  await db.update(s.banners).set({ active: !b.a }).where(eq(s.banners.id, id));
  revalidatePath("/admin/banners");
}

export async function deleteBanner(f: FormData) {
  await requireAdmin();
  await flashSaved();
  await db.delete(s.banners).where(eq(s.banners.id, Number(f.get("id"))));
  revalidatePath("/admin/banners");
}
