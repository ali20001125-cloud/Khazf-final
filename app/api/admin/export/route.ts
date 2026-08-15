/** تصدير CSV (طلبات · عملاء · تحليلات) — نسخة احتياطية تُفتح بالإكسل. محمي بالمدير. */
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type Col = { key: string; label: string };

function toCsv(rows: Row[], cols: Col[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = cols.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c.key])).join(",")).join("\r\n");
  return "﻿" + head + "\r\n" + body; // BOM ليقرأ الإكسل العربي صحيحاً
}

export async function GET(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const type = new URL(req.url).searchParams.get("type") || "orders";
  const today = new Date().toISOString().slice(0, 10);
  let content = "", filename = `khazf-${type}-${today}.csv`;

  if (type === "customers") {
    const rows = (await db.execute(sql`
      SELECT name, phone, email, governorate, address, points_balance, journey_orders,
             to_char(created_at,'YYYY-MM-DD') AS created,
             to_char(last_order_at,'YYYY-MM-DD') AS last_order
      FROM customers WHERE phone NOT LIKE 'auth:%' ORDER BY created_at DESC`)).rows as Row[];
    content = toCsv(rows, [
      { key: "name", label: "الاسم" }, { key: "phone", label: "الهاتف" }, { key: "email", label: "الإيميل" },
      { key: "governorate", label: "المحافظة" }, { key: "address", label: "العنوان" },
      { key: "points_balance", label: "رصيد النقاط" }, { key: "journey_orders", label: "عدد الطلبات" },
      { key: "created", label: "تاريخ التسجيل" }, { key: "last_order", label: "آخر طلب" },
    ]);
  } else if (type === "analytics") {
    const rows = (await db.execute(sql`
      SELECT to_char(created_at,'YYYY-MM-DD') AS day,
        count(*)::int AS orders, COALESCE(SUM(total),0)::int AS revenue,
        COALESCE(SUM(product_profit),0)::int AS profit
      FROM orders WHERE is_test = false AND status <> 'CANCELLED'
      GROUP BY 1 ORDER BY 1 DESC`)).rows as Row[];
    content = toCsv(rows, [
      { key: "day", label: "اليوم" }, { key: "orders", label: "الطلبات" },
      { key: "revenue", label: "المبيعات" }, { key: "profit", label: "الربح" },
    ]);
  } else {
    const rows = (await db.execute(sql`
      SELECT order_number, to_char(created_at,'YYYY-MM-DD HH24:MI') AS date, name, phone, email,
        governorate, address, status, items_subtotal, quantity_discount, coupon_discount,
        journey_discount, points_used, delivery_charged, total, points_earned, note
      FROM orders WHERE is_test = false ORDER BY created_at DESC`)).rows as Row[];
    content = toCsv(rows, [
      { key: "order_number", label: "رقم الطلب" }, { key: "date", label: "التاريخ" }, { key: "name", label: "الاسم" },
      { key: "phone", label: "الهاتف" }, { key: "email", label: "الإيميل" }, { key: "governorate", label: "المحافظة" },
      { key: "address", label: "العنوان" }, { key: "status", label: "الحالة" }, { key: "items_subtotal", label: "المنتجات" },
      { key: "quantity_discount", label: "خصم البوكس" }, { key: "coupon_discount", label: "خصم الكود" },
      { key: "journey_discount", label: "خصم الرحلة" }, { key: "points_used", label: "نقاط مستخدمة" },
      { key: "delivery_charged", label: "التوصيل" }, { key: "total", label: "الإجمالي" },
      { key: "points_earned", label: "نقاط مكتسبة" }, { key: "note", label: "ملاحظة" },
    ]);
    filename = `khazf-orders-${today}.csv`;
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
