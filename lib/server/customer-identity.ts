/**
 * هوية الزبون الموحّدة — بترتيب الثقة:
 * ١) جلسة Google (Supabase) مربوطة بعميل → هاتفه
 * ٢) الكوكي الموقّع (يُثبَّت عند الطلب) — كما هو
 */
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getCustomerPhone } from "./customer-session";
import { supabaseConfigured } from "./admin-auth";

export async function getSupabaseUser(): Promise<{ id: string; email: string | null } | null> {
  if (!supabaseConfigured()) return null;
  try {
    const jar = await cookies();
    const { createServerClient } = await import("@supabase/ssr");
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );
    const { data } = await sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } catch {
    return null;
  }
}

export async function getCustomerIdentity(): Promise<{
  phone: string | null;
  authUser: { id: string; email: string | null } | null;
  linked: boolean;
}> {
  const authUser = await getSupabaseUser();
  if (authUser) {
    // ١) ربط مباشر بمعرّف المصادقة
    const [byAuth] = await db
      .select({ phone: s.customers.phone })
      .from(s.customers)
      .where(eq(s.customers.authUserId, authUser.id));
    if (byAuth) return { phone: byAuth.phone, authUser, linked: true };
    // ٢) لم يُربط بعد؟ ابحث بالإيميل واربطه تلقائياً (تسجيل إيميل قبل التأكيد)
    if (authUser.email) {
      const [byEmail] = await db
        .select({ phone: s.customers.phone })
        .from(s.customers)
        .where(eq(s.customers.email, authUser.email));
      if (byEmail) {
        await db.update(s.customers)
          .set({ authUserId: authUser.id })
          .where(eq(s.customers.phone, byEmail.phone));
        return { phone: byEmail.phone, authUser, linked: true };
      }
    }
    /* ربط بالهاتف من الكوكي — لمن طلب سابقاً بلا بريد */
    const cookiePhone = await getCustomerPhone();
    if (cookiePhone) {
      const [byPhone] = await db
        .select({ phone: s.customers.phone, authUserId: s.customers.authUserId })
        .from(s.customers)
        .where(eq(s.customers.phone, cookiePhone));
      if (byPhone && !byPhone.authUserId) {
        await db.update(s.customers)
          .set({ authUserId: authUser.id, email: authUser.email ?? undefined })
          .where(eq(s.customers.phone, byPhone.phone));
        return { phone: byPhone.phone, authUser, linked: true };
      }
    }
    return { phone: cookiePhone, authUser, linked: false };
  }
  return { phone: await getCustomerPhone(), authUser: null, linked: false };
}
