/** اختبار محرك الطلبات — سيناريوهات القسم ٨ على قاعدة حية */
import "dotenv/config";
import { sql, eq } from "drizzle-orm";
import { db, schema as s } from "../lib/server/db";
import { createOrder } from "../lib/server/orders";
import { deliverOrder } from "../lib/server/orders-admin";
import { settleLoyalty } from "../lib/server/loyalty";

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};
const stockOf = async (slug: string) => {
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(b.qty_remaining),0)::int g FROM inventory_batches b
    JOIN products p ON p.id=b.product_id WHERE p.slug=${slug}`);
  return (r.rows[0] as { g: number }).g;
};

async function reset() {
  await db.execute(sql`TRUNCATE orders, order_items, inventory_movements, inventory_batches,
    customers, cashback_ledger, coupons, coupon_usages RESTART IDENTITY CASCADE`);
  await db.execute(sql`ALTER SEQUENCE khazf_order_seq RESTART 1001`);
  const coffees = await db.select().from(s.products).where(eq(s.products.type, "COFFEE"));
  for (const c of coffees)
    await db.insert(s.inventoryBatches).values({
      productId: c.id, qtyReceived: 5000, qtyRemaining: 5000,
      importCostPerKilo: 60000, shipCostPerKilo: 4000, packCostPerKilo: 4000,
    });
  await db.update(s.settingsInternal).set({ deliveryCostBasra: 2000, deliveryCostOther: 4000 });
}

async function main() {
  await reset();
  // يعطّل رحلة زبون حتى تُختبر ميزات أخرى بمعزل عن مكافأة الطلب الأول
  const noJourney = async (phone: string) => {
    await db.insert(s.customers).values({ phone, name: "ت", governorate: "بغداد", address: "-", journeyActive: false, journeyOrders: 0 })
      .onConflictDoUpdate({ target: s.customers.phone, set: { journeyActive: false } });
  };
  const base = { name: "علي", governorate: "بغداد", address: "الكرادة" };

  console.log("── ١) طلب بسيط: كالدي ربع ──");
  const r1 = await createOrder({ ...base, phone: "07701234567",
    items: [{ slug: "kaldi", variant: "G250", qty: 1, grind: "V60" }] });
  ok(/^KHZ-\d+$/.test(r1.orderNumber) && typeof r1.seqNo === "number", `رقمان: فاتورة ${r1.orderNumber} · داخلي #${r1.seqNo}`);
  ok(r1.total === 27500, `أول طلب: توت باج/مكافأة مستوى ١ (خصم ٥٪→1,500) · 26k−1.5k+3k = 27,500: ${r1.total}`);
  ok((await stockOf("kaldi")) === 4750, `المخزون خُصم FIFO: ${await stockOf("kaldi")}`);
  const [o1] = await db.select().from(s.orders).where(eq(s.orders.id, r1.orderId));
  ok(o1.productProfit === 7500, `الربح بعد خصم الرحلة: 9,000−1,500 = 7,500: ${o1.productProfit}`);
  ok(r1.pointsEarned === 24, `نقاط الكسب على المبلغ بعد الخصم: 24: ${r1.pointsEarned}`);

  console.log("── ٢) التقريب لأعلى ٢٥٠ (مثال الوثيقة) ──");
  // زبون برصيد متاح 56 نقطة = 1,680 د
  await db.insert(s.customers).values({ phone: "07709999999", name: "ت", governorate: "بغداد", address: "-" });
  await db.insert(s.cashbackLedger).values({ customerPhone: "07709999999", type: "EARN", points: 56,
    availableAt: new Date(Date.now() - 1000) });
  await db.update(s.customers).set({ journeyActive: false }).where(eq(s.customers.phone, "07709999999"));
  await db.transaction(async (tx) => { await settleLoyalty(tx, "07709999999"); });
  const r2 = await createOrder({ ...base, phone: "07709999999", usePoints: true,
    items: [{ slug: "antigua", variant: "G250", qty: 1 }] });
  const [o2] = await db.select().from(s.orders).where(eq(s.orders.id, r2.orderId));
  ok(o2.pointsUsed === 1500, `استُخدم 1,500 فقط (يطابق ورقة ٢٥٠) والباقي 6 نقاط محفوظ: ${o2.pointsUsed}`);
  ok(o2.totalRaw === 21500 && r2.total === 21500, `الإجمالي 21,500 قابل للدفع تماماً بلا تقريب: ${r2.total}`);

  console.log("── ٣) بوكس ٣ أكياس (خصم ١٠٪) ──");
  await noJourney("07702222222");
  const r3 = await createOrder({ ...base, phone: "07702222222",
    items: [
      { slug: "kaldi", variant: "G250", qty: 1, boxGroup: 1 },
      { slug: "cerrado", variant: "G250", qty: 1, boxGroup: 1 },
      { slug: "dorado", variant: "G250", qty: 1, boxGroup: 1 },
    ] });
  const [o3] = await db.select().from(s.orders).where(eq(s.orders.id, r3.orderId));
  ok(o3.quantityDiscount === 7500, `خصم البوكس 7,500 (10٪ من 75k): ${o3.quantityDiscount}`);
  ok(r3.total === 70500, `الإجمالي 70,500: ${r3.total}`);

  console.log("── ٤) بوكس ٥ أكياس (٢٠٪ + توصيل مجاني) — بصرة ──");
  await noJourney("07703333333");
  const r4 = await createOrder({ ...base, phone: "07703333333", governorate: "البصرة",
    items: [
      { slug: "kaldi", variant: "G250", qty: 2, boxGroup: 2 },
      { slug: "cerrado", variant: "G250", qty: 1, boxGroup: 2 },
      { slug: "dorado", variant: "G250", qty: 1, boxGroup: 2 },
      { slug: "antigua", variant: "G250", qty: 1, boxGroup: 2 },
    ] });
  const [o4] = await db.select().from(s.orders).where(eq(s.orders.id, r4.orderId));
  ok(o4.quantityDiscount === 24200, `خصم ٢٠٪ = 24,200: ${o4.quantityDiscount}`);
  ok(o4.deliveryCharged === 0, `توصيل الزبون 0 (مكافأة ٥ أكياس)`);
  ok(o4.deliveryCost === 2000 && o4.deliveryNet === -2000, `تكلفة بصرة 2,000 · صافي −2,000`);
  ok(r4.total === 97000, `96,800 → تقريب 97,000: ${r4.total}`);

  console.log("── ٥) رحلة الولاء: الطلب الثاني لنفس الزبون → مستوى ٢ (توصيل مجاني) ──");
  const r5 = await createOrder({ ...base, phone: "07701234567",
    items: [{ slug: "cerrado", variant: "G250", qty: 1 }] });
  const [o5] = await db.select().from(s.orders).where(eq(s.orders.id, r5.orderId));
  ok(r5.appliedJourney?.level === 2, `الطلب الثاني = مستوى ٢: ${r5.appliedJourney?.level}`);
  ok(o5.deliveryCharged === 0, `توصيل مجاني (مستوى ٢): ${o5.deliveryCharged}`);
  ok(r5.total === 24000, `الإجمالي = سعر سيرادو بلا توصيل (مستوى ٢): ${r5.total}`);

  console.log("── ٦) كود عام TEST10 ──");
  await db.insert(s.coupons).values({ code: "TEST10", type: "PERCENT", value: 10 });
  const r6 = await createOrder({ ...base, phone: "07704444444", couponCode: "test10",
    items: [{ slug: "dorado", variant: "G250", qty: 1 }] });
  const [o6] = await db.select().from(s.orders).where(eq(s.orders.id, r6.orderId));
  const [c6] = await db.select().from(s.coupons).where(eq(s.coupons.code, "TEST10"));
  ok(o6.couponDiscount === 2500 && c6.usedCount === 1, `خصم الكود 2,500 · عدّاد=1`);

  console.log("── ٧) بيع زائد → فشل وتراجع كامل ──");
  const kaldiBefore = await stockOf("kaldi");
  const ordersBefore = Number((await db.execute(sql`SELECT count(*) c FROM orders`)).rows[0].c);
  let threw = false;
  try {
    await createOrder({ ...base, phone: "07705555555",
      items: [{ slug: "kaldi", variant: "G250", qty: 20 }] }); // 5,000غ والمتبقي 4,000
  } catch (e) { threw = true; console.log(`  ↩ ${(e as Error).message}`); }
  const ordersAfter = Number((await db.execute(sql`SELECT count(*) c FROM orders`)).rows[0].c);
  ok(threw && (await stockOf("kaldi")) === kaldiBefore && ordersAfter === ordersBefore,
    `المخزون والطلبات بلا تغيير بعد التراجع`);

  console.log("── ٨) التوصيل يفتح كسب النقاط بعد ٤٨ سا ──");
  await deliverOrder(r1.orderId);
  let bal = 0;
  await db.transaction(async (tx) => { bal = (await settleLoyalty(tx, "07701234567")).balance; });
  await db.update(s.cashbackLedger).set({ availableAt: new Date(Date.now() - 1000) })
    .where(eq(s.cashbackLedger.orderId, r1.orderId));
  await db.transaction(async (tx) => { bal = (await settleLoyalty(tx, "07701234567")).balance; });
  ok(bal === 24, `بعدها: الرصيد 24 نقطة (نقاط الطلب الأول بعد خصم الرحلة)`);

  console.log(`\n${fail === 0 ? "✅" : "❌"} النتيجة: ${pass} ناجح · ${fail} فاشل`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("✗", e); process.exit(1); });
