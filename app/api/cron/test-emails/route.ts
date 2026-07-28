import { NextResponse } from "next/server";
import { emailNewOrderAdmin, emailOrderCustomer, emailReviewRequest, emailCartReminder } from "@/lib/server/email";
import { db, schema as s } from "@/lib/server/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * رابط اختبار مؤقت — يرسل كل أنواع الإيميلات دفعة واحدة لبريد محدّد.
 *   GET /api/cron/test-emails?key=CRON_SECRET&to=email@example.com
 * يُحذف بعد الاختبار.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const to = url.searchParams.get("to");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  if (!to) return NextResponse.json({ error: "أضف &to=إيميلك" }, { status: 400 });

  const [cfg] = await db.select({ logoUrl: s.settings.logoUrl, whatsapp: s.settings.whatsapp })
    .from(s.settings).where(eq(s.settings.id, 1));
  const site = process.env.SITE_URL || "https://khazf.shop";
  const items = [
    { name: "كالدي", qty: 1, price: 26000, line: 26000 },
    { name: "قمع UFO الذكي", qty: 1, price: 35000, line: 35000 },
  ];

  // 1) تأكيد الطلب (للزبون)
  await emailOrderCustomer({
    email: to, orderNumber: "KHZ-TEST", name: "علي", total: 61000,
    invoiceUrl: `${site}/invoice/test`, items,
    itemsSubtotal: 61000, deliveryCharged: 0, freeDelivery: true,
  });

  // 2) إشعار طلب جديد (للمدير) — نرسله لنفس الإيميل للمعاينة
  const origAdmin = process.env.ADMIN_EMAIL;
  process.env.ADMIN_EMAIL = to;
  await emailNewOrderAdmin({
    orderNumber: "KHZ-TEST", name: "علي", phone: "07701234567",
    governorate: "بغداد", total: 61000, invoiceUrl: `${site}/invoice/test`,
  });
  if (origAdmin) process.env.ADMIN_EMAIL = origAdmin;

  // 3) طلب التقييم
  await emailReviewRequest({
    email: to, name: "علي", orderNumber: "KHZ-TEST", reviewUrl: `${site}/review?token=test`,
  });

  // 4) قوالب تذكير السلة الثلاثة
  const reviews = { "كالدي": { rating: 5, comment: "نكهتها فاكهية واضحة على الفلتر", author: "زينب" } };
  for (let i = 0; i < 3; i++) {
    await emailCartReminder({
      email: to, name: "علي",
      items: items.map((x) => ({ name: x.name, qty: x.qty, price: x.price })),
      total: 61000, cartUrl: `${site}/cart/`,
      logoUrl: cfg?.logoUrl, whatsapp: cfg?.whatsapp, reviews,
    }, i);
  }

  return NextResponse.json({ ok: true, sent: "6 إيميلات (تأكيد طلب، إشعار مدير، تقييم، 3 قوالب سلة)", to });
}
