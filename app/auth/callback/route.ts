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
    const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
    if (exErr) {
      // نُظهر السبب بدل الرجوع الصامت
      const u = new URL("/account/", url.origin);
      u.searchParams.set("authError", exErr.message.slice(0, 120));
      return NextResponse.redirect(u);
    }

    /* ينشئ سجلّ العميل ويرسل الترحيب فوراً — بلا انتظار هاتف */
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (user?.email) {
        const { db, schema: sc } = await import("@/lib/server/db");
        const { eq, sql } = await import("drizzle-orm");
        const { emailWelcome } = await import("@/lib/server/email");
        const email = user.email.trim().toLowerCase();
        const nice = email.split("@")[0];

        const [byAuth] = await db.select().from(sc.customers).where(eq(sc.customers.authUserId, user.id));
        if (byAuth) {
          if (!byAuth.welcomedAt) {
            await db.update(sc.customers).set({ welcomedAt: new Date() }).where(eq(sc.customers.phone, byAuth.phone));
            emailWelcome({ email: byAuth.email || email, name: byAuth.name || nice }).catch(() => {});
          }
        } else {
          const [byEmail] = await db.select().from(sc.customers).where(sql`lower(${sc.customers.email}) = ${email}`);
          if (byEmail) {
            const first = !byEmail.welcomedAt;
            await db.update(sc.customers)
              .set({ authUserId: user.id, welcomedAt: byEmail.welcomedAt ?? new Date() })
              .where(eq(sc.customers.phone, byEmail.phone));
            if (first) emailWelcome({ email, name: byEmail.name || nice }).catch(() => {});
          } else {
            await db.insert(sc.customers).values({
              phone: `auth:${user.id.slice(0, 18)}`, authUserId: user.id,
              name: nice, email, governorate: "", address: "", welcomedAt: new Date(),
            }).onConflictDoNothing();
            emailWelcome({ email, name: nice }).catch(() => {});
          }
        }
      }
    } catch { /* لا يوقف الدخول */ }
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
