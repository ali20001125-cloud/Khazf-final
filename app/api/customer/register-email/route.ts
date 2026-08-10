/**
 * تسجيل دخول بالإيميل فقط (بلا رقم بعد).
 * جدول customers مفتاحه phone، فقبل أول طلب لا يوجد صفّ للزبون.
 * حساب المصادقة (authUserId + email) محفوظ في Supabase auth تلقائياً.
 *
 * هنا: لو الإيميل يخصّ زبوناً موجوداً (طلب سابقاً بنفس الإيميل)،
 * نربط authUserId بصفّه حتى تظهر طلباته فور الدخول.
 * وإلا: لا حاجة لأي شيء — الرقم والربط يكتملان عند أول طلب.
 */
import { NextResponse } from "next/server";
import { emailWelcome } from "@/lib/server/email";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { setCustomerCookie } from "@/lib/server/customer-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { authUserId?: string; email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const authUserId = body.authUserId ?? null;
  if (!email) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  // هل للإيميل حساب زبون موجود (سبق أن طلب بنفس الإيميل)؟
  const [existing] = await db.select().from(s.customers).where(eq(s.customers.email, email));
  if (existing) {
    if (authUserId && !existing.authUserId) {
      await db.update(s.customers).set({ authUserId }).where(eq(s.customers.phone, existing.phone));
      // ترحيب عند ربط الحساب لأول مرة
      emailWelcome({ email, name: existing.name || "صديق خزف" }).catch(() => {});
    }
    await setCustomerCookie(existing.phone);
  }
  return NextResponse.json({ ok: true, hasProfile: !!existing });
}
