/**
 * الكتالوج الحي — القاعدة هي المصدر، والواجهة تستلم نفس الشكل الذي بُنيت عليه
 * قواعد التحويل:
 * • priceG500/priceG1000 = null → الوزن لا يُعرض (0 هنا = غير متاح)
 * • oosBehavior=HIDE ونفد → المنتج يُستبعد كلياً
 * • rating/reviewsCount من التقييمات المنشورة فقط (متجر جديد = 0 — لا أرقام مخترعة)
 * • الأدوات تظهر فقط إذا كان أحد أماكنها (إسبريسو/تقطير) فعّالاً
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getStockMap } from "./stock";
import type { Coffee, Tool, ToolCat } from "@/lib/data";

/* ألوان الهوية لكل محصول — عرض فقط */
const ACCENTS: Record<string, string> = {
  kaldi: "#C08A6E",
  cerrado: "#A66A4C",
  dorado: "#C9A961",
  antigua: "#8A9A5B",
};

/* وصفات التحضير الافتراضية بحسب التحميص — حتى تُدار من اللوحة لاحقاً */
const BREW_DEFAULT = [
  { name: "V60", nums: "١٥غ · ٢٥٠مل · ٩٢° · ٣:٠٠" },
  { name: "إسبريسو", nums: "١٨غ ← ٣٦غ · ٢٥–٣٠ ث" },
  { name: "فرنش برس", nums: "٢٠غ · ٣٠٠مل · ٩٣° · ٤:٠٠" },
];

export interface CatalogPlace {
  slug: string;
  name: string;
}

export interface PromoBanner {
  text: string;
  promoText: string | null;
  promoLink: string | null;
}

export interface CatalogData {
  coffees: Coffee[];
  tools: Tool[];
  places: CatalogPlace[];
  boxGiftNames: string[];
  banners: PromoBanner[];
}

type ProductRow = typeof s.products.$inferSelect;

function coffeeFromRow(
  p: ProductRow,
  stock: number,
  agg: { avg: number; count: number } | undefined,
  isNew: boolean
): Coffee | null {
  const grams = stock;
  const soldOut = grams < 250;
  if (soldOut && p.oosBehavior === "HIDE") return null;
  const bagsLeft = Math.floor(grams / 250);
  return {
    slug: p.slug,
    name: p.name,
    latin: p.latinName ?? p.name,
    country: p.country ?? "",
    latinOrigin: p.latinOrigin ?? "",
    altitude: p.altitude ?? "—",
    process: p.process ?? "—",
    roast: p.roast ?? "—",
    variety: p.variety ?? "—",
    region: p.region ?? "",
    sca: p.sca ?? undefined,
    prices: {
      g250: p.priceG250 ?? 0,
      g500: p.priceG500 ?? 0, // 0 = الوزن غير متاح ولا يُعرض
      g1000: p.priceG1000 ?? 0,
    },
    notes: p.notes ?? [],
    trigger: p.trigger ?? "",
    desc: p.description ?? "",
    accent: ACCENTS[p.slug] ?? "#A66A4C",
    rating: agg?.avg ?? 0,
    reviewsCount: agg?.count ?? 0,
    brew: BREW_DEFAULT,
    isNew: isNew || p.badge === "جديد",
    stockLow:
      !soldOut && p.stockThreshold > 0 && grams <= p.stockThreshold
        ? bagsLeft
        : undefined,
    farm: p.farm ?? "",
    story: p.story ?? "",
  };
}

function toolFromRow(
  p: ProductRow,
  stock: number,
  cats: ToolCat[],
  subName: string | null,
  agg: { avg: number; count: number } | undefined
): Tool | null {
  const soldOut = stock < 1;
  if (soldOut && p.oosBehavior === "HIDE") return null;
  return {
    slug: p.slug,
    name: p.name,
    latin: p.latinName ?? p.name,
    type: subName ?? "أدوات",
    cats,
    price: p.pricePiece ?? 0,
    rating: agg?.avg ?? 0,
    reviewsCount: agg?.count ?? 0,
    desc: p.description ?? "",
    isNew: p.badge === "جديد",
    soldOut: soldOut || undefined,
  };
}

/** الجلب الكامل — استدعاء واحد من الـ layout لكل زيارة */
export async function getCatalog(): Promise<CatalogData> {
  const placesRows = await db
    .select()
    .from(s.places)
    .where(eq(s.places.active, true))
    .orderBy(s.places.sort);
  const activePlaceIds = new Set(placesRows.map((p) => p.id));
  const espActive = placesRows.some((p) => p.slug === "espresso_tools");
  const dripActive = placesRows.some((p) => p.slug === "drip_tools");

  const rows = await db.select().from(s.products).where(eq(s.products.active, true));
  if (rows.length === 0) return { coffees: [], tools: [], places: [], boxGiftNames: [], banners: [] };

  const ids = rows.map((r) => r.id);
  const [stockMap, pp, subs, aggRows, gifts, bannerRows] = await Promise.all([
    getStockMap(ids),
    db.select().from(s.productPlaces).where(inArray(s.productPlaces.productId, ids)),
    db.select().from(s.subcategories),
    db
      .select({
        productId: s.reviews.productId,
        avg: sql<number>`ROUND(AVG(${s.reviews.rating})::numeric, 1)::float`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(s.reviews)
      .where(and(inArray(s.reviews.productId, ids), eq(s.reviews.status, "PUBLISHED")))
      .groupBy(s.reviews.productId),
    db.select().from(s.boxGifts).where(eq(s.boxGifts.active, true)).orderBy(s.boxGifts.sort),
    db.select().from(s.banners).where(eq(s.banners.active, true)).orderBy(s.banners.sort),
  ]);

  const subName = new Map(subs.map((x) => [x.id, x.name]));
  const agg = new Map(aggRows.map((a) => [a.productId, { avg: a.avg, count: a.count }]));
  const placeSlugById = new Map(placesRows.map((p) => [p.id, p.slug]));
  const placesOf = (pid: number) =>
    pp.filter((x) => x.productId === pid && activePlaceIds.has(x.placeId)).map((x) => placeSlugById.get(x.placeId)!);

  /* «جديد» تلقائياً: أحدث إضافة خلال ٣٠ يوماً */
  const monthAgo = Date.now() - 30 * 86400_000;

  const coffees: Coffee[] = [];
  const tools: Tool[] = [];
  for (const p of rows) {
    const stock = stockMap.get(p.id) ?? 0;
    if (p.type === "COFFEE") {
      const c = coffeeFromRow(p, stock, agg.get(p.id), p.createdAt.getTime() > monthAgo);
      if (c && placesOf(p.id).length > 0) coffees.push(c);
    } else {
      const slugsHere = placesOf(p.id);
      const cats: ToolCat[] = [];
      if (espActive && slugsHere.includes("espresso_tools")) cats.push("إسبريسو");
      if (dripActive && slugsHere.includes("drip_tools")) cats.push("تقطير");
      if (cats.length === 0) continue; // أماكن الأدوات مُوقَفة → لا تظهر
      const t = toolFromRow(p, stock, cats, p.subcategoryId ? (subName.get(p.subcategoryId) ?? null) : null, agg.get(p.id));
      if (t) tools.push(t);
    }
  }

  const now = new Date();
  return {
    coffees,
    tools,
    places: placesRows.filter((p) => p.showInNav).map((p) => ({ slug: p.slug, name: p.name })),
    boxGiftNames: gifts.map((g) => g.name),
    banners: bannerRows
      .filter((b) => (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now))
      .map((b) => ({ text: b.text, promoText: b.promoText, promoLink: b.promoLink })),
  };
}

/** المحاصيل المسموحة بالبوكس */
export async function getBoxCoffeeSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: s.products.slug })
    .from(s.products)
    .where(and(eq(s.products.active, true), eq(s.products.type, "COFFEE"), eq(s.products.allowInBox, true)));
  return rows.map((r) => r.slug);
}
