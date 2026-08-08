import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // بيئة الاختبار: منع كامل للفهرسة
  if (process.env.NEXT_PUBLIC_ENV === "staging")
    return { rules: { userAgent: "*", disallow: "/" } };

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart/", "/checkout/", "/account/", "/lp/"] },
    sitemap: "https://khazf.shop/sitemap.xml",
  };
}
