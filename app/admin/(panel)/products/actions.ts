"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && String(v).trim() !== "" ? Math.round(n) : null;
};

function parseProduct(f: FormData) {
  const type = String(f.get("type")) as "COFFEE" | "TOOL";
  return {
    type,
    slug: String(f.get("slug")).trim(),
    name: String(f.get("name")).trim(),
    latinName: String(f.get("latinName") ?? "").trim() || null,
    active: f.get("active") === "on",
    badge: String(f.get("badge") ?? "").trim() || null,
    featured: f.get("featured") === "on",
    description: String(f.get("description") ?? "").trim() || null,
    trigger: String(f.get("trigger") ?? "").trim() || null,
    country: String(f.get("country") ?? "").trim() || null,
    flag: String(f.get("flag") ?? "").trim() || null,
    latinOrigin: String(f.get("latinOrigin") ?? "").trim() || null,
    region: String(f.get("region") ?? "").trim() || null,
    variety: String(f.get("variety") ?? "").trim() || null,
    process: String(f.get("process") ?? "").trim() || null,
    roast: String(f.get("roast") ?? "").trim() || null,
    altitude: String(f.get("altitude") ?? "").trim() || null,
    sca: num(f.get("sca")),
    notes: String(f.get("notes") ?? "").split("،").map((x) => x.trim()).filter(Boolean),
    flavorAcidity: num(f.get("flavorAcidity")),
    flavorSweetness: num(f.get("flavorSweetness")),
    flavorBody: num(f.get("flavorBody")),
    farm: String(f.get("farm") ?? "").trim() || null,
    story: String(f.get("story") ?? "").trim() || null,
    priceG250: num(f.get("priceG250")),
    priceG500: num(f.get("priceG500")),
    priceG1000: num(f.get("priceG1000")),
    pricePiece: num(f.get("pricePiece")),
    subcategoryId: num(f.get("subcategoryId")),
    stockThreshold: num(f.get("stockThreshold")) ?? 0,
    oosBehavior: (String(f.get("oosBehavior")) === "HIDE" ? "HIDE" : "SHOW_BADGE") as "HIDE" | "SHOW_BADGE",
    allowInBox: f.get("allowInBox") === "on",
    images: String(f.get("images") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
  };
}

async function syncPlaces(productId: number, f: FormData) {
  const chosen = f.getAll("places").map(Number).filter(Boolean);
  await db.delete(s.productPlaces).where(eq(s.productPlaces.productId, productId));
  if (chosen.length)
    await db.insert(s.productPlaces).values(chosen.map((placeId) => ({ productId, placeId })));
}

export async function createProduct(f: FormData) {
  await requireAdmin();
  const data = parseProduct(f);
  const [row] = await db.insert(s.products).values(data).returning({ id: s.products.id });
  await syncPlaces(row.id, f);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function updateProduct(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id"));
  await db.update(s.products).set(parseProduct(f)).where(eq(s.products.id, id));
  await syncPlaces(id, f);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function toggleProduct(f: FormData) {
  await requireAdmin();
  const id = Number(f.get("id"));
  const [p] = await db.select({ a: s.products.active }).from(s.products).where(eq(s.products.id, id));
  await db.update(s.products).set({ active: !p.a }).where(eq(s.products.id, id));
  revalidatePath("/admin/products");
  revalidatePath("/");
}
