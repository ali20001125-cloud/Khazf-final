import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // هوستنجر يحقن SUPABASE_URL/SUPABASE_API_KEY — نجسّرها لأسمائنا
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_API_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  },
  async headers() {
    return [
      /* الملفات الثابتة تُخزَّن سنة — تسريع الزيارات المتكرّرة */
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // فرض HTTPS لمدّة سنتين على النطاق وكل نطاقاته الفرعية
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
      },
    ];
  },
  trailingSlash: true,
  images: {
    unoptimized: true,   // هوستنجر بلا معالج صور — نبقيها كما هي
  },
  compress: true,
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["lucide-react"] },
  /* لا نُحوّل الشيفرة لمتصفّحات قديمة — يقلّل الحزمة ووقت التنفيذ */
  compiler: { removeConsole: process.env.NODE_ENV === "production" },
};

export default nextConfig;
