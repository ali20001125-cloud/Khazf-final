"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/admin-guard";
import { toNum } from "@/lib/num";
import { flashSaved } from "@/lib/server/flash";

const num = (v: FormDataEntryValue | null) => {
  const n = toNum(v);
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n) : null;
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
    featured: false,
    description: String(f.get("description") ?? "").trim() || null,
    trigger: String(f.get("trigger") ?? "").trim() || null,
    country: String(f.get("country") ?? "").trim() || null,
    flag: String(f.get("flag") ?? "").trim() || null,
    latinOrigin: String(f.get("latinOrigin") ?? "").trim() || null,
    region: String(f.get("region") ?? "").trim() || null,
    variety: String(f.get("variety") ?? "").trim() || null,
    process: String(f.get("process") ?? "").trim() || null,
    roast: String(f.get("roast") ?? "").trim() || null,
    roastedOn: String(f.get("roastedOn") ?? "").trim() || null,
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
    salePrice: num(f.get("salePrice")),
    costPiece: num(f.get("costPiece")),
    stockPieces: num(f.get("stockPieces")),
    subcategoryId: num(f.get("subcategoryId")),
    stockThreshold: (() => {
      const bags = num(f.get("stockThresholdBags"));
      const isCoffee = String(f.get("type")) === "COFFEE";
      return bags != null ? bags * (isCoffee ? 250 : 1) : 2000;
    })(),
    oosBehavior: (String(f.get("oosBehavior")) === "HIDE" ? "HIDE" : "SHOW_BADGE") as "HIDE" | "SHOW_BADGE",
    allowInBox: f.get("allowInBox") === "on",
    toolSpecs: (() => {
      // للأدوات فقط: نقرأ JSON التفاصيل. للقهوة null.
      if (type !== "TOOL") return null;
      try {
        const parsed = JSON.parse(String(f.get("tool_specs") ?? "null"));
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch { return null; }
    })(),
    images: (() => {
      try { const a = JSON.parse(String(f.get("images") ?? "[]")); return Array.isArray(a) ? a.filter(Boolean) : []; }
      catch { const u = String(f.get("images") ?? "").trim(); return u ? [u] : []; }
    })(),
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
  await flashSaved();
  const data = parseProduct(f);
  const [row] = await db.insert(s.products).values(data).returning({ id: s.products.id });
  await syncPlaces(row.id, f);
  if (data.type === "TOOL") await syncVariants(row.id, f);
  revalidatePath("/alikhazf25/products");
  revalidatePath("/");
}


/** يزامن خيارات المنتج (أحجام/ألوان/عبوات) من النموذج */
async function syncVariants(productId: number, f: FormData) {
  const raw = f.get("variants");
  if (raw == null) return; // النموذج لم يرسل الحقل — لا نلمس الخيارات
  let rows: { id?: number; label: string; kind: string; price: unknown; salePrice?: unknown;
    costPrice?: unknown; stock: unknown; hex?: string | null; image?: string | null; active?: boolean }[] = [];
  try { rows = JSON.parse(String(raw)); } catch { return; }
  if (!Array.isArray(rows)) return;

  const n = (v: unknown) => {
    const x = Number(String(v ?? "").replace(/[^0-9-]/g, ""));
    return Number.isFinite(x) && String(v ?? "").trim() !== "" ? x : null;
  };
  const clean = rows
    .filter((r) => String(r.label ?? "").trim() !== "" || String((r as { hex?: string }).hex ?? "").trim() !== "" || String(r.image ?? "").trim() !== "")
    .map((r, i) => ({
      productId,
      label: String(r.label ?? "").trim().slice(0, 80) || `خيار ${i + 1}`,
      kind: ["SIZE", "COLOR", "PACK"].includes(String(r.kind)) ? String(r.kind) : "SIZE",
      // صفر يعني «بلا سعر خاص» → نخزّنه فارغاً ليتراجع للسعر العام
      price: n(r.price) || null,
      salePrice: n(r.salePrice) || null,
      costPrice: n(r.costPrice) || null,
      stock: n(r.stock) ?? 0,
      hex: String((r as { hex?: string }).hex ?? "").trim() || null,
      image: String(r.image ?? "").trim() || null,
      sort: i,
      active: r.active !== false,
    }));

  // نستبدل الخيارات بالكامل (أبسط وأأمن من المطابقة الجزئية)
  await db.delete(s.productVariants).where(eq(s.productVariants.productId, productId));
  if (clean.length > 0) await db.insert(s.productVariants).values(clean);
}

export async function updateProduct(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const id = Number(f.get("id"));
  const data = parseProduct(f);

  // حماية: لو النموذج أرسل toolSpecs فارغة تماماً لكن المنتج له تفاصيل محفوظة،
  // نحتفظ بالموجودة (نتفادى مسحها بالخطأ عند التعديل — مثلاً عند رفع صورة فقط)
  if (data.type === "TOOL") {
    const isEmpty = (t: typeof data.toolSpecs) => {
      if (!t || typeof t !== "object") return true;
      const o = t as Record<string, unknown>;
      const arrs = ["features", "specs", "parts", "hotspots", "sizes", "colors", "compat", "boxContents"];
      const noArrays = arrs.every((k) => !Array.isArray(o[k]) || (o[k] as unknown[]).length === 0);
      const noHero = !o.hero || String(o.hero).trim() === "";
      return noArrays && noHero;
    };
    if (isEmpty(data.toolSpecs)) {
      const [existing] = await db.select({ ts: s.products.toolSpecs }).from(s.products).where(eq(s.products.id, id));
      if (existing?.ts) data.toolSpecs = existing.ts as typeof data.toolSpecs;
    }
  }

  await db.update(s.products).set(data).where(eq(s.products.id, id));
  await syncPlaces(id, f);
  if (data.type === "TOOL") await syncVariants(id, f);
  revalidatePath("/alikhazf25/products");
  revalidatePath("/");
}

export async function toggleProduct(f: FormData) {
  await requireAdmin();
  await flashSaved();
  const id = Number(f.get("id"));
  const [p] = await db.select({ a: s.products.active }).from(s.products).where(eq(s.products.id, id));
  await db.update(s.products).set({ active: !p.a }).where(eq(s.products.id, id));
  revalidatePath("/alikhazf25/products");
  revalidatePath("/");
}
