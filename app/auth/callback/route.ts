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
  return NextResponse.redirect(new URL(next, url.origin));
}
