/** تصدير CSV (طلبات · عملاء · تحليلات) — نسخة احتياطية تُفتح بالإكسل. محمي بالمدير. */
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin-auth";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";
import { fetchMetaInsights, fetchMetaBreakdown, USD_TO_IQD, type DateArg } from "@/lib/server/meta";

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
  } else if (type === "ads") {
    const u = new URL(req.url);
    const custom = u.searchParams.get("from") && u.searchParams.get("to");
    const dateArg: DateArg = custom
      ? { since: u.searchParams.get("from")!, until: u.searchParams.get("to")! }
      : { preset: u.searchParams.get("range") || "last_7d" };
    const [m, ageGender, region] = await Promise.all([
      fetchMetaInsights(dateArg),
      fetchMetaBreakdown(dateArg, "age,gender"),
      fetchMetaBreakdown(dateArg, "region"),
    ]);
    const spendIqd = m.currency === "USD" ? m.spend * USD_TO_IQD : m.spend;
    const summary: Row[] = [
      { k: "الصرف", v: `${m.spend} ${m.currency}` },
      { k: "الصرف (دينار)", v: Math.round(spendIqd) },
      { k: "النقرات", v: m.clicks }, { k: "نسبة النقر٪", v: m.ctr },
      { k: "كلفة النقرة", v: m.cpc }, { k: "مشتريات Meta", v: m.purchases },
    ];
    const lines: string[] = [toCsv(summary, [{ key: "k", label: "المؤشر" }, { key: "v", label: "القيمة" }])];
    if (ageGender.rows.length)
      lines.push("\r\n" + toCsv(ageGender.rows as unknown as Row[], [{ key: "label", label: "العمر/الجنس" }, { key: "spend", label: "الصرف" }, { key: "clicks", label: "النقرات" }, { key: "purchases", label: "شراء" }]));
    if (region.rows.length)
      lines.push("\r\n" + toCsv(region.rows as unknown as Row[], [{ key: "label", label: "المنطقة" }, { key: "spend", label: "الصرف" }, { key: "clicks", label: "النقرات" }, { key: "purchases", label: "شراء" }]));
    content = lines.join("\r\n");
    filename = `khazf-ads-${today}.csv`;
  } else if (type === "journeys") {
    const u = new URL(req.url);
    const toISO = (u.searchParams.get("to") ? new Date(u.searchParams.get("to")! + "T23:59:59.999Z") : new Date()).toISOString();
    const fromISO = (u.searchParams.get("from") ? new Date(u.searchParams.get("from")! + "T00:00:00.000Z") : new Date(Date.now() - 30 * 86400_000)).toISOString();
    const raw = (await db.execute(sql`
      SELECT session_id,
        to_char(min(created_at),'YYYY-MM-DD HH24:MI') AS started,
        round(EXTRACT(EPOCH FROM (max(created_at)-min(created_at))))::int AS seconds,
        count(*)::int AS pages,
        (array_agg(referrer ORDER BY created_at) FILTER (WHERE referrer IS NOT NULL AND referrer <> ''))[1] AS referrer,
        (array_agg(device ORDER BY created_at))[1] AS device,
        (array_agg(path ORDER BY created_at))[1] AS landing,
        (array_agg(path ORDER BY created_at DESC))[1] AS exit_path,
        bool_or(path LIKE '/checkout%') AS reached_checkout
      FROM page_views WHERE created_at >= ${fromISO} AND created_at <= ${toISO}
      GROUP BY session_id ORDER BY started DESC LIMIT 5000`)).rows as Row[];
    const src = (ref: unknown) => {
      const r = String(ref || "").toLowerCase();
      if (!r) return "مباشر";
      if (r.includes("instagram")) return "Instagram";
      if (r.includes("facebook") || r.includes("fb")) return "Facebook";
      if (r.includes("google")) return "Google";
      if (r.includes("tiktok")) return "TikTok";
      return "أخرى";
    };
    const rows = raw.map((r) => ({ ...r, source: src(r.referrer), checkout: r.reached_checkout ? "نعم" : "لا" }));
    content = toCsv(rows, [
      { key: "started", label: "الوقت" }, { key: "source", label: "المصدر" }, { key: "device", label: "الجهاز" },
      { key: "pages", label: "عدد الصفحات" }, { key: "seconds", label: "الثواني" },
      { key: "landing", label: "صفحة الدخول" }, { key: "exit_path", label: "صفحة الخروج" },
      { key: "checkout", label: "وصل الدفع" }, { key: "session_id", label: "معرّف الزيارة" },
    ]);
    filename = `khazf-journeys-${today}.csv`;
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
