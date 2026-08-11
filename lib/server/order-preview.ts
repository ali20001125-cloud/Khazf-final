import { db } from "@/lib/server/db";
import * as s from "@/lib/server/db/schema";
import { and, eq, sql, sql as sqlRaw, asc } from "drizzle-orm";
import { normalizeIqPhone } from "@/lib/phone";

const roundUp250 = (n: number) => Math.ceil(Math.max(0, n) / 250) * 250;
/** توصيل الولاء المجاني لا يُمنح إلا فوق هذا الحدّ — يطابق orders.ts */
const JOURNEY_FREE_DELIVERY_MIN = 25000;

export type PreviewInput = {
  items: { slug: string; variant: "G250" | "G500" | "G1000" | "PIECE"; qty: number; boxGroup?: number | null; variantId?: number | null }[];
  phone?: string;
  governorate?: string;
  couponCode?: string;
  usePoints?: boolean;
};

export type PreviewResult = {
  itemsSubtotal: number;   // بعد خصم كمية البوكس
  grossSubtotal: number;   // قبل أي خصم
  boxDiscount: number;     // خصم أكياس البوكس
  boxCapReached?: boolean; // بلغ الخصم سقفه
  journeyDiscount: number; // خصم الرحلة (النسبة الحقيقية — التقريب على الإجمالي)
  journeyPct: number;      // النسبة المعروضة للزبون (مثل ١٠)
  couponDiscount: number;
  pointsAvailable: number;      // رصيد النقاط بالدينار
  pointsUsedDinars: number;     // المستخدم فعلاً (مضاعفات ٢٥٠)
  pointsRemaining: number;      // الباقي بعد الاستخدام
  deliveryCharged: number;
  freeDelivery: boolean;
  total: number;                // الإجمالي النهائي المقرّب
  giftName: string | null;      // هدية الرحلة إن وُجدت
};

/** معاينة حسابية حية — تطابق منطق createOrder بلا حفظ */
export async function previewOrder(input: PreviewInput): Promise<PreviewResult> {
  const phone = normalizeIqPhone(input.phone ?? "") ?? "";
  const [settings] = await db.select().from(s.settings).where(eq(s.settings.id, 1));

  // ١) أسعار المنتجات
  const slugs = [...new Set(input.items.map((i) => i.slug))];
  const empty: PreviewResult = {
    itemsSubtotal: 0, grossSubtotal: 0, boxDiscount: 0, journeyDiscount: 0, journeyPct: 0,
    couponDiscount: 0, pointsAvailable: 0, pointsUsedDinars: 0, pointsRemaining: 0,
    deliveryCharged: settings?.deliveryCustomerPrice ?? 0, freeDelivery: false, total: 0, giftName: null,
  };
  if (slugs.length === 0) return empty;

  const products = await db.select().from(s.products)
    .where(and(sql`${s.products.slug} IN (${sql.join(slugs.map((x) => sql`${x}`), sql`, `)})`, eq(s.products.active, true)));
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const priceOf = (p: typeof s.products.$inferSelect, v: string) =>
    v === "G500" ? p.priceG500 : v === "G1000" ? p.priceG1000 : v === "PIECE" ? p.pricePiece : p.priceG250;

  let grossSubtotal = 0;
  const boxLines: { qty: number; total: number; group: number }[] = [];
  const wantedVIds = [...new Set(input.items.map((i) => i.variantId).filter((x): x is number => !!x))];
  const vRows = wantedVIds.length > 0
    ? await db.select().from(s.productVariants).where(
        sqlRaw`${s.productVariants.id} IN (${sqlRaw.join(wantedVIds.map((x) => sqlRaw`${x}`), sqlRaw`, `)})`)
    : [];
  const byVId = new Map(vRows.map((v) => [v.id, v]));

  for (const it of input.items) {
    const p = bySlug.get(it.slug);
    if (!p) continue;
    const ch = it.variantId ? byVId.get(it.variantId) : undefined;
    const unit = ch ? (ch.salePrice ?? ch.price ?? p.salePrice ?? p.pricePiece ?? 0)
      : (it.variant === "PIECE" ? (p.salePrice ?? priceOf(p, it.variant)) : priceOf(p, it.variant)) ?? 0;
    const lineTotal = unit * it.qty;
    grossSubtotal += lineTotal;
    // خصم الكمية يشمل كل أكياس ٢٥٠غ — داخل الصندوق أو خارجه (الكيلو مستثنى)
    if (it.variant === "G250") boxLines.push({ qty: it.qty, total: lineTotal, group: 0 });
  }

  // ٢) خصم أكياس البوكس — كل صندوق يُحسب وحده والسقف يُطبّق عليه منفرداً
  const tiers = (settings?.boxTiers ?? []) as { bags: number; rewardType: string; value?: number }[];
  const boxCap = settings?.boxDiscountCap ?? 0;
  const bags = boxLines.reduce((t, l) => t + l.qty, 0);
  const boxSubtotal = boxLines.reduce((t, l) => t + l.total, 0);
  let boxPct = 0, freeDeliveryBox = false;
  for (const t of tiers) if (bags >= t.bags) {
    if (t.rewardType === "PERCENT") boxPct = Math.max(boxPct, t.value ?? 0);
    if (t.rewardType === "FREE_DELIVERY") freeDeliveryBox = true;
  }
  const rawBoxDiscount = Math.round((boxSubtotal * boxPct) / 100);
  const boxDiscount = boxCap > 0 ? Math.min(rawBoxDiscount, boxCap) : rawBoxDiscount;
  const capReached = boxCap > 0 && rawBoxDiscount > boxCap;
  const itemsSubtotal = grossSubtotal - boxDiscount;

  // ٣) كوبون
  let couponDiscount = 0, freeDeliveryCoupon = false;
  if (input.couponCode?.trim()) {
    const code = input.couponCode.trim().toUpperCase();
    const [c] = await db.select().from(s.coupons).where(eq(s.coupons.code, code));
    if (c && c.active && (!c.expiresAt || c.expiresAt >= new Date())) {
      if (c.type === "PERCENT") couponDiscount = Math.round((itemsSubtotal * c.value) / 100);
      else if (c.type === "FIXED") couponDiscount = Math.min(c.value, itemsSubtotal);
      else freeDeliveryCoupon = true;
    }
  }

  // ٤) خصم الرحلة (تلقائي) — مقرّب لأعلى ٢٥٠ (للزبون تظهر النسبة، للحساب مقرّبة)
  let journeyDiscount = 0, journeyPct = 0, freeDeliveryJourney = false, giftName: string | null = null;
  let customer: typeof s.customers.$inferSelect | null = null;
  if (phone) {
    const [c] = await db.select().from(s.customers).where(eq(s.customers.phone, phone));
    customer = c ?? null;
    const completed = customer?.journeyActive ? (customer.journeyOrders ?? 0) : 0;
    const currentLevel = (completed % 6) + 1; // الطلب الحالي ياخذ مكافأة مستواه
    {
      const [lvl] = await db.select().from(s.journeyLevels)
        .where(and(eq(s.journeyLevels.level, currentLevel), eq(s.journeyLevels.active, true)));
      if (lvl) {
        if (lvl.rewardType === "PERCENT") {
          journeyPct = lvl.value;
          // خصم النسبة الحقيقي (مثل الكوبون) — التقريب لأعلى ٢٥٠ يتم على الإجمالي النهائي لصالح المتجر
          journeyDiscount = Math.round((itemsSubtotal * lvl.value) / 100);
        } else if (lvl.rewardType === "FIXED") journeyDiscount = Math.min(lvl.value, itemsSubtotal - couponDiscount);
        else if (lvl.rewardType === "FREE_DELIVERY") freeDeliveryJourney = itemsSubtotal >= JOURNEY_FREE_DELIVERY_MIN;
        else giftName = lvl.giftName ?? "هدية";
      }
    }
  }

  const afterDiscounts = Math.max(0, itemsSubtotal - couponDiscount - journeyDiscount);

  // ٥) التوصيل
  const thresholdMet = (settings?.freeDeliveryThreshold ?? 0) > 0 && itemsSubtotal >= settings.freeDeliveryThreshold;
  const isFirstOrder = (settings?.freeDeliveryFirstOrder ?? true) && !customer
    && itemsSubtotal >= (settings?.freeDeliveryFirstMin ?? 0);
  const freeDelivery = freeDeliveryBox || freeDeliveryJourney || freeDeliveryCoupon || thresholdMet || isFirstOrder;
  const deliveryCharged = freeDelivery ? 0 : (settings?.deliveryCustomerPrice ?? 0);

  // ٦) الكاش باك — يُستخدم بمضاعفات ٢٥٠ فقط، بحيث الإجمالي يبقى قابلاً للدفع
  const pointValue = settings?.pointValue ?? 1;
  const pointsAvailable = customer ? customer.pointsBalance * pointValue : 0;
  let pointsUsedDinars = 0;
  if (input.usePoints && pointsAvailable > 0) {
    const preTotal = afterDiscounts + deliveryCharged;
    // أكبر مضاعف ٢٥٠ لا يتجاوز الرصيد ولا الإجمالي
    const cap = Math.min(pointsAvailable, preTotal);
    pointsUsedDinars = Math.floor(cap / 250) * 250;
  }
  const pointsRemaining = pointsAvailable - pointsUsedDinars;

  // ٧) الإجمالي + تقريب لأعلى ٢٥٠
  const total = roundUp250(afterDiscounts - pointsUsedDinars + deliveryCharged);

  return {
    itemsSubtotal, grossSubtotal, boxDiscount, boxCapReached: capReached, journeyDiscount, journeyPct,
    couponDiscount, pointsAvailable, pointsUsedDinars, pointsRemaining,
    deliveryCharged, freeDelivery, total, giftName,
  };
}
