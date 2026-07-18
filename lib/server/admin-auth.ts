/**
 * مصادقة اللوحة — مساران:
 * • الإنتاج: Supabase Auth (Google) → التحقق من جدول admins
 * • محلي/طوارئ: كلمة مرور ADMIN_PASSWORD → كوكي HMAC (يُعطَّل تلقائياً عند ضبط Supabase)
 */
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema as s } from "./db";

const COOKIE = "khz_admin";
const secret = () => process.env.AUTH_SECRET || "dev-secret-change-me";
export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sign = (v: string) => `${v}.${createHmac("sha256", secret()).update(v).digest("base64url")}`;
const verify = (t?: string) => {
  if (!t) return null;
  const i = t.lastIndexOf(".");
  if (i < 1) return null;
  const v = t.slice(0, i);
  const expect = createHmac("sha256", secret()).update(v).digest("base64url");
  try { if (timingSafeEqual(Buffer.from(t.slice(i + 1)), Buffer.from(expect))) return v; } catch {}
  return null;
};

/** هل الطلب الحالي لمدير موثَّق؟ */
export async function getAdmin(): Promise<{ name: string; email: string | null } | null> {
  const jar = await cookies();

  if (supabaseConfigured()) {
    /* جلسة Supabase (تُضبط عبر @supabase/ssr في /admin/login) ثم التحقق من جدول admins */
    const { createServerClient } = await import("@supabase/ssr");
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => jar.getAll(), setAll: () => {} } }
    );
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) return null;
    let [row] = await db.select().from(s.admins).where(eq(s.admins.email, u.email ?? ""));
    if (!row) {
      /* أول دخول والجدول فارغ = المالك المؤسِّس (مرة واحدة فقط) */
      const all = await db.select({ id: s.admins.id }).from(s.admins).limit(1);
      if (all.length === 0 && u.email) {
        [row] = await db.insert(s.admins)
          .values({ email: u.email, name: "المالك", authUserId: u.id })
          .returning();
      } else return null;
    }
    if (!row.authUserId)
      await db.update(s.admins).set({ authUserId: u.id }).where(eq(s.admins.id, row.id));
    return { name: row.name, email: row.email };
  }

  /* الوضع المحلي */
  const v = verify(jar.get(COOKIE)?.value);
  return v === "owner" ? { name: "المالك", email: null } : null;
}

export async function devLogin(password: string): Promise<boolean> {
  if (supabaseConfigured()) return false;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) return false;
  (await cookies()).set(COOKIE, sign("owner"), {
    httpOnly: true, sameSite: "lax", path: "/",
    secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function adminLogout() {
  (await cookies()).delete(COOKIE);
}
