/** رجوع Google → تبادل الرمز بجلسة (كوكيز Supabase) ثم التحويل للحساب */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account/";
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const jar = await cookies();
    const { createServerClient } = await import("@supabase/ssr");
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (all) => all.forEach(({ name, value, options }) => jar.set(name, value, options)),
        },
      }
    );
    await sb.auth.exchangeCodeForSession(code);
  }
  // نبني التوجيه بالدومين الحقيقي — لا url.origin (يعطي 0.0.0.0 على الخادم).
  // الأولوية: SITE_URL ← x-forwarded-host ← host ← احتياطي khazf.shop
  const fwdHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.SITE_URL ??
    (fwdHost ? `${proto}://${fwdHost}` : null) ??
    (host && !host.includes("0.0.0.0") && !host.includes("localhost") ? `${proto}://${host}` : null) ??
    "https://khazf.shop";
  return NextResponse.redirect(new URL(next, base));
}
