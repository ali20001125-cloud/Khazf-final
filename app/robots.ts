import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart/", "/checkout/", "/account/", "/lp/"] },
    sitemap: "https://khazf.shop/sitemap.xml",
  };
}
