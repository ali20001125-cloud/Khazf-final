/** رجوع Google → تبادل الرمز بجلسة (كوكيز Supabase) ثم التحويل للحساب */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account/";

  /* النطاق الذي جاء منه الطلب فعلاً */
  const host = req.headers.get("host");
  const fwdHost = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const base =
    (fwdHost ? `${proto}://${fwdHost}` : null) ??
    (host && !host.includes("0.0.0.0") && !host.includes("localhost") ? `${proto}://${host}` : null) ??
    process.env.SITE_URL ??
    "https://khazf.shop";

  /* الاستجابة تُنشأ أولاً — الكوكيز تُكتب عليها مباشرة وإلا ضاعت مع التحويل */
  const res = NextResponse.redirect(new URL(next, base));

  if (!code || !process.env.NEXT_PUBLIC_SUPABASE_URL) return res;

  const { createServerClient } = await import("@supabase/ssr");
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          req.headers.get("cookie")
            ? req.headers.get("cookie")!.split("; ").map((c) => {
                const i = c.indexOf("=");
                return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
              })
            : [],
        setAll: (all) =>
          all.forEach(({ name, value, options }) =>
            res.cookies.set({ name, value, ...options, path: "/", sameSite: "lax", secure: true })
          ),
      },
    }
  );

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    const u = new URL("/account/", base);
    u.searchParams.set("authError", error.message.slice(0, 120));
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

  return res;
}
