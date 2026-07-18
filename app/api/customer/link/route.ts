/**
 * ربط حساب Google برقم هاتف — بإثبات ملكية:
 * الهاتف + رقم أي طلب سابق له (لا يعرفه غير صاحبه)
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getSupabaseUser } from "@/lib/server/customer-identity";
import { setCustomerCookie } from "@/lib/server/customer-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSupabaseUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك بـ Google أولاً" }, { status: 401 });
  const { phone, orderNumber } = (await req.json().catch(() => ({}))) as { phone?: string; orderNumber?: string };
  const ph = phone?.trim() ?? "";
  const on = orderNumber?.trim().toUpperCase() ?? "";
  if (!/^07\d{9}$/.test(ph) || !on)
    return NextResponse.json({ error: "أدخل الهاتف ورقم أي طلب سابق" }, { status: 400 });

  const [o] = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.orderNumber, on), eq(s.orders.customerPhone, ph)));
  if (!o) return NextResponse.json({ error: "لم نجد طلباً بهذا الرقم لهذا الهاتف" }, { status: 404 });

  const [taken] = await db.select({ p: s.customers.phone }).from(s.customers).where(eq(s.customers.authUserId, user.id));
  if (taken && taken.p !== ph)
    return NextResponse.json({ error: "حسابك مربوط برقم آخر" }, { status: 409 });

  await db.update(s.customers).set({ authUserId: user.id }).where(eq(s.customers.phone, ph));
  await setCustomerCookie(ph);
  return NextResponse.json({ ok: true });
}
