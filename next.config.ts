import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // هوستنجر يحقن SUPABASE_URL/SUPABASE_API_KEY — نجسّرها لأسمائنا
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_API_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
