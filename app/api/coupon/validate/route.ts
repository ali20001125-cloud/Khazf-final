import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";

export const runtime = "nodejs";

/** فحص كود للعرض بالسلة — التحقق النهائي الملزم يتم داخل createOrder */
export async function POST(req: Request) {
  const { code, phone } = (await req.json().catch(() => ({}))) as { code?: string; phone?: string };
  if (!code?.trim()) return NextResponse.json({ error: "أدخل الكود" }, { status: 400 });
  const c = (await db.select().from(s.coupons).where(eq(s.coupons.code, code.trim().toUpperCase())))[0];
  const now = new Date();
  if (!c || !c.active) return NextResponse.json({ error: "الكود غير صالح" }, { status: 404 });
  if (c.expiresAt && c.expiresAt < now) return NextResponse.json({ error: "الكود منتهي" }, { status: 410 });
  if (c.usageLimit != null && c.usedCount >= c.usageLimit)
    return NextResponse.json({ error: "الكود استُنفد" }, { status: 410 });
  if (c.targetPhone && phone && c.targetPhone !== phone)
    return NextResponse.json({ error: "الكود غير مخصص لهذا الرقم" }, { status: 403 });
  if (c.perCustomerLimit != null && phone) {
    const used = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.couponUsages)
      .where(and(eq(s.couponUsages.couponCode, c.code), eq(s.couponUsages.customerPhone, phone)));
    if (used[0].n >= c.perCustomerLimit)
      return NextResponse.json({ error: "استخدمت هذا الكود سابقاً" }, { status: 403 });
  }
  return NextResponse.json({ code: c.code, type: c.type, value: c.value });
}
