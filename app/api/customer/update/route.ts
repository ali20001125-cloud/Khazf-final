/**
 * تعديل بيانات الزبون من صفحة حسابه.
 * آمن: يعدّل فقط حساب الزبون الحالي (المتحقّق عبر جلسته).
 * الاسم/الإيميل/المحافظة/العنوان: تعديل مباشر.
 * الرقم: حسّاس (هوية أساسية) — يُعدّل بحذر مع فحص التعارض.
 */
import { NextResponse } from "next/server";
import { normalizeIqPhone } from "@/lib/phone";
import { eq, and, ne } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getCustomerPhone } from "@/lib/server/customer-session";
import { setCustomerCookie } from "@/lib/server/customer-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // هوية الزبون الحالي من جلسته (لا يعدّل غيره)
  const currentPhone = await getCustomerPhone();
  if (!currentPhone)
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string; email?: string; governorate?: string; address?: string; phone?: string;
  };

  const [me] = await db.select().from(s.customers).where(eq(s.customers.phone, currentPhone));
  if (!me) return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const governorate = body.governorate?.trim();
  const address = body.address?.trim();
  const newPhone = body.phone ? normalizeIqPhone(body.phone) : null;

  // تحقّق الإيميل (لو أُرسل)
  if (email !== undefined && email !== "" && !/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ error: "إيميل غير صحيح" }, { status: 400 });

  // تحقّق الإيميل غير محجوز لزبون آخر
  if (email) {
    const [emailOwner] = await db.select({ phone: s.customers.phone })
      .from(s.customers).where(and(eq(s.customers.email, email), ne(s.customers.phone, currentPhone)));
    if (emailOwner)
      return NextResponse.json({ error: "هذا الإيميل مستخدم بحساب آخر" }, { status: 409 });
  }

  // ═══ تعديل الرقم (حسّاس) ═══
  if (newPhone && newPhone !== currentPhone) {
    // الرقم الجديد محجوز؟
    const [taken] = await db.select({ phone: s.customers.phone })
      .from(s.customers).where(eq(s.customers.phone, newPhone));
    if (taken)
      return NextResponse.json({ error: "الرقم الجديد مسجّل بحساب آخر" }, { status: 409 });

    // ننقل كل السجلّات المرتبطة للرقم الجديد (الطلبات، النقاط، الرحلة) بمعاملة واحدة.
    // ترتيب آمن مع الـFK: إدراج صف الزبون الجديد ← تحويل المراجع ← حذف القديم.
    await db.transaction(async (tx) => {
      // authUserId فريد — نفكّه عن الصفّ القديم أولاً وإلا فشل الإدراج
      if (me.authUserId)
        await tx.update(s.customers).set({ authUserId: null }).where(eq(s.customers.phone, currentPhone));

      await tx.insert(s.customers).values({
        phone: newPhone,
        authUserId: me.authUserId,
        welcomedAt: me.welcomedAt,
        name: name || me.name,
        governorate: governorate || me.governorate,
        address: address ?? me.address,
        email: email !== undefined ? (email || null) : me.email,
        marketingOptIn: me.marketingOptIn,
        adminNotes: me.adminNotes,
        pointsBalance: me.pointsBalance,
        journeyOrders: me.journeyOrders,
        journeyActive: me.journeyActive,
        loyaltyExpiresAt: me.loyaltyExpiresAt,
        lastOrderAt: me.lastOrderAt,
      });
      // 4) تحويل التبعيات للرقم الجديد
      await tx.update(s.orders).set({ customerPhone: newPhone }).where(eq(s.orders.customerPhone, currentPhone));
      await tx.update(s.couponUsages).set({ customerPhone: newPhone }).where(eq(s.couponUsages.customerPhone, currentPhone));
      await tx.update(s.cashbackLedger).set({ customerPhone: newPhone }).where(eq(s.cashbackLedger.customerPhone, currentPhone));
      // 5) حذف الصف القديم (بعد أن أصبحت التبعيات تشير للجديد)
      await tx.delete(s.customers).where(eq(s.customers.phone, currentPhone));
    });
    await setCustomerCookie(newPhone);
    return NextResponse.json({ ok: true, phone: newPhone });
  }

  // ═══ تعديل الحقول الأخرى (بلا تغيير رقم) ═══
  await db.update(s.customers).set({
    name: name || me.name,
    email: email !== undefined ? (email || null) : me.email,
    governorate: governorate || me.governorate,
    address: address ?? me.address,
  }).where(eq(s.customers.phone, currentPhone));

  return NextResponse.json({ ok: true, phone: currentPhone });
}
