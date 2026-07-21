/**
 * إنشاء ملف زبون بعد تسجيل الإيميل بـ Supabase.
 * يربط الهاتف (المفتاح) بحساب المصادقة. لو الرقم موجود بطلبات سابقة،
 * يلتحم بها فترجع نقاطه القديمة تلقائياً.
 */
import { NextResponse } from "next/server";
import { normalizeIqPhone } from "@/lib/phone";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getSupabaseUser } from "@/lib/server/customer-identity";
import { setCustomerCookie } from "@/lib/server/customer-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string; name?: string; phone?: string; governorate?: string; address?: string;
  };
  const email = body.email?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const phone = normalizeIqPhone(body.phone ?? "") ?? "";
  const governorate = body.governorate?.trim() ?? "";
  const address = body.address?.trim() ?? "";  // اختياري — يُكمل بالطلب

  const user = await getSupabaseUser();
  const gName = name || (user?.email ? user.email.split("@")[0] : "صديق خزف");
  if (!phone || !governorate)
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const authUserId = user?.id ?? null;

  // الرقم محجوز لحساب مصادقة آخر؟
  const [existing] = await db.select().from(s.customers).where(eq(s.customers.phone, phone));
  if (existing?.authUserId && authUserId && existing.authUserId !== authUserId)
    return NextResponse.json({ error: "هذا الرقم مرتبط بحساب آخر" }, { status: 409 });

  if (existing) {
    // التحام بحساب قائم (نقاطه القديمة تبقى) — نكمل الحقول الناقصة
    const newEmail = (email || user?.email || "").trim();
    await db.update(s.customers).set({
      authUserId: authUserId ?? existing.authUserId,
      email: newEmail || existing.email,   // الإيميل الأحدث يُحدّث الحساب
      name: name || existing.name || gName, // الاسم الأحدث أولاً
      governorate: governorate || existing.governorate,
      address: address || existing.address,
    }).where(eq(s.customers.phone, phone));
  } else {
    await db.insert(s.customers).values({ phone, authUserId, name: gName, governorate, address: address || "", email: email || user?.email || null });
  }

  await setCustomerCookie(phone);
  return NextResponse.json({ ok: true });
}
