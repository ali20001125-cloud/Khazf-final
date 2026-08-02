import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  emailOrderCustomer, emailNewOrderAdmin, emailReviewRequest, emailWelcome,
  emailBrewGuide, emailRestock, emailBrewTips, emailNewProduct, emailCartReminder,
} from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * معاينة كل أنواع البريد على بريد واحد.
 *   GET /api/test-emails?key=CRON_SECRET&to=you@mail.com
 *   &only=welcome   — نوع واحد فقط (اختياري)
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const to = (url.searchParams.get("to") ?? "").trim();
  if (!to || !to.includes("@"))
    return NextResponse.json({ error: "أضف ?to=بريدك" }, { status: 400 });

  const only = url.searchParams.get("only");
  const site = process.env.SITE_URL ?? "https://khazf.shop";

  // نأخذ محصولاً حقيقياً ليكون المحتوى واقعياً
  const p = (await db.execute(sql`
    SELECT slug, name, notes, roast, brew, images, price_g250
    FROM products WHERE type='COFFEE' AND active=true ORDER BY id LIMIT 1`)).rows[0] as unknown as
    { slug: string; name: string; notes: string[] | null; roast: string | null;
      brew: { name: string; nums: string }[] | null; images: string[] | null; price_g250: number } | undefined;

  const img = p?.images?.[0] ?? null;
  const sample = {
    orderNumber: "KHZ-TEST", name: "علي", total: 76000,
    invoiceUrl: `${site}/invoice/?n=KHZ-TEST&p=07700000000`,
    items: [
      { name: p?.name ?? "كالدي", qty: 2, line: 52000, image: img },
      { name: "قمع V60", qty: 1, line: 18000, image: null },
    ],
    itemsSubtotal: 70000, journeyDiscount: 5000, pointsUsed: 0,
    deliveryCharged: 0, freeDelivery: true,
    pointsEarned: 2100, pointsBalanceAfter: 11070,
    journeyOrders: 4, giftName: "كوب سيراميك",
  };

  const cartData = {
    email: to, name: "علي",
    items: [
      { name: p?.name ?? "كالدي", qty: 2, price: p?.price_g250 ?? 26000 },
      { name: "قمع V60", qty: 1, price: 18000 },
    ],
    total: 70000,
    cartUrl: `${site}/cart/`,
  };

  const jobs: Record<string, () => Promise<void>> = {
    welcome: () => emailWelcome({ email: to, name: "علي" }),
    order_confirm: () => emailOrderCustomer({ email: to, ...sample }),
    admin_order: () => emailNewOrderAdmin({
      orderNumber: "KHZ-TEST", name: "علي", phone: "07700000000",
      governorate: "بغداد", address: "شارع تجريبي", total: 76000,
      items: sample.items.map((i) => ({ name: i.name, qty: i.qty, line: i.line })),
    } as never),
    review: () => emailReviewRequest({
      email: to, orderNumber: "KHZ-TEST", name: "علي",
      reviewUrl: `${site}/review/?token=TEST`,
    } as never),
    guide: () => emailBrewGuide({ email: to, guideUrl: `${site}/guide/` }),
    restock: () => emailRestock({
      email: to, productName: p?.name ?? "كالدي",
      url: `${site}/product/?c=${p?.slug ?? "kaldi"}`,
    }),
    brew_tips: () => emailBrewTips({
      email: to, name: "علي",
      coffees: [{
        name: p?.name ?? "كالدي", notes: p?.notes ?? ["توت", "أزهار"], roast: p?.roast ?? "فاتح",
        brew: p?.brew?.length ? p.brew : [
          { name: "V60", nums: "٢٠غ · ٣٠٠مل · ٩٢° · ٢:٤٥" },
          { name: "كيمكس", nums: "٣٠غ · ٤٥٠مل · ٩٣° · ٤:٠٠" },
        ],
      }],
    }),
    cart_1: async () => { await emailCartReminder(cartData, 0); },
    cart_2: async () => { await emailCartReminder(cartData, 1); },
    cart_3: async () => { await emailCartReminder(cartData, 2); },
    announce: () => emailNewProduct({
      email: to, productName: p?.name ?? "كالدي",
      url: `${site}/product/?c=${p?.slug ?? "kaldi"}`,
      image: img, note: "محصول جديد وصل للتوّ — كمية محدودة.",
      price: p?.price_g250 ?? 26000,
    }),
  };

  const names = only && jobs[only] ? [only] : Object.keys(jobs);
  const sent: string[] = [];
  const failed: { kind: string; err: string }[] = [];

  for (const n of names) {
    try { await jobs[n](); sent.push(n); }
    catch (e) { failed.push({ kind: n, err: e instanceof Error ? e.message : "خطأ" }); }
    // فاصل بسيط حمايةً لحدّ الاستضافة
    await new Promise((r) => setTimeout(r, 400));
  }

  return NextResponse.json({
    ok: true, to, sent, failed,
    hint: "أضف &only=welcome لإرسال نوع واحد فقط",
    types: Object.keys(jobs),
  });
}
