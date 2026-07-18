import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { orderNumber, phone } = (await req.json().catch(() => ({}))) as {
    orderNumber?: string;
    phone?: string;
  };
  if (!orderNumber?.trim() || !phone?.trim())
    return NextResponse.json({ error: "أدخل رقم الطلب والهاتف" }, { status: 400 });
  const [o] = await db
    .select()
    .from(s.orders)
    .where(and(eq(s.orders.orderNumber, orderNumber.trim().toUpperCase()), eq(s.orders.phone, phone.trim())));
  if (!o) return NextResponse.json({ error: "لم نجد طلباً بهذه البيانات" }, { status: 404 });
  return NextResponse.json({
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.total,
    createdAt: o.createdAt,
    deliveredAt: o.deliveredAt,
  });
}
