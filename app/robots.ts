import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart/", "/checkout/", "/account/"] },
    sitemap: "https://khazf.coffee/sitemap.xml",
  };
}
