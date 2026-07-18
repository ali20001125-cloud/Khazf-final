import type { MetadataRoute } from "next";
import { eq, and } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://khazf.coffee";
  const fixed = ["", "products/", "box/", "recipes/", "journal/", "about/", "faq/", "shipping/", "returns/", "contact/"]
    .map((p) => ({ url: `${base}/${p}`, changeFrequency: "weekly" as const }));
  try {
    const prods = await db
      .select({ slug: s.products.slug, type: s.products.type })
      .from(s.products)
      .where(eq(s.products.active, true));
    return [
      ...fixed,
      ...prods.map((p) => ({
        url: `${base}/product/?${p.type === "COFFEE" ? "c" : "t"}=${p.slug}`,
        changeFrequency: "weekly" as const,
      })),
    ];
  } catch {
    return fixed;
  }
}
