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
    const [c] = await db
      .select({ phone: s.customers.phone })
      .from(s.customers)
      .where(eq(s.customers.authUserId, authUser.id));
    if (c) return { phone: c.phone, authUser, linked: true };
    /* جلسة Google بلا ربط بعد — الكوكي القديم قد يكمّل */
    return { phone: await getCustomerPhone(), authUser, linked: false };
  }
  return { phone: await getCustomerPhone(), authUser: null, linked: false };
}
