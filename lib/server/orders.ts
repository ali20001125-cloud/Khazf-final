/**
 * محرك الطلبات ⭐ — كل الحساب بالخادم داخل Transaction واحدة (القسم ٨)
 * لا ثقة بأي رقم من المتصفح: الأسعار والخصومات تُحسب من القاعدة حصراً
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { settleLoyalty } from "./loyalty";

export type CheckoutItem = {
  slug: string;
  variant: "G250" | "G500" | "G1000" | "PIECE";
  qty: number;
  grind?: string;
  boxGroup?: number | null;
};

export type CheckoutInput = {
  name: string;
  phone: string;
  email?: string | null;
  marketingOptIn?: boolean;
  governorate: string;
  address: string;
  note?: string | null;
  items: CheckoutItem[];
  couponCode?: string | null;
  usePoints?: boolean;
  boxGiftChoice?: string | null;
};

const GRAMS: Record<string, number> = { G250: 250, G500: 500, G1000: 1000, PIECE: 0 };
const roundUp250 = (n: number) => Math.ceil(Math.max(0, n) / 250) * 250;

export async function createOrder(input: CheckoutInput) {
  const phone = input.phone.trim();
  if (!/^07\d{9}$/.test(phone)) throw new Error("رقم الهاتف غير صالح");
  if (!input.items.length) throw new Error("السلة فارغة");

  return db.transaction(async (tx) => {
    const [settings] = await tx.select().from(s.settings).where(eq(s.settings.id, 1));
    const [internal] = await tx.select().from(s.settingsInternal).where(eq(s.settingsInternal.id, 1));

    /* ── ١) حل المنتجات والأسعار من القاعدة ── */
    const slugs = [...new Set(input.items.map((i) => i.slug))];
    const products = await tx
      .select()
      .from(s.products)
      .where(and(sql`${s.products.slug} IN (${sql.join(slugs.map((x) => sql`${x}`), sql`, `)})`, eq(s.products.active, true)));
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    type Line = {
      productId: number | null;
      name: string;
      variant: "G250" | "G500" | "G1000" | "PIECE" | "GIFT";
      unitPrice: number;
      qty: number;
      gramsTotal: number;
      lineTotal: number;
      boxGroup: number | null;
      isGift: boolean;
      isCoffee: boolean;
      grind?: string;
    };
    const lines: Line[] = [];

    for (const it of input.items) {
      const p = bySlug.get(it.slug);
      if (!p) throw new Error(`منتج غير متاح: ${it.slug}`);
      const qty = Math.max(1, Math.floor(it.qty));
      const price =
        it.variant === "PIECE"
          ? p.pricePiece
          : it.variant === "G250"
            ? p.priceG250
            : it.variant === "G500"
              ? p.priceG500
              : p.priceG1000;
      if (price == null) throw new Error(`الوزن غير متاح لـ${p.name}`);
      lines.push({
        productId: p.id,
        name: p.name + (it.grind ? ` · ${it.grind}` : ""),
        variant: it.variant,
        unitPrice: price,
        qty,
        gramsTotal: GRAMS[it.variant] * qty,
        lineTotal: price * qty,
        boxGroup: it.boxGroup ?? null,
        isGift: false,
        isCoffee: p.type === "COFFEE",
        grind: it.grind,
      });
    }

    const grossSubtotal = lines.reduce((t, l) => t + l.lineTotal, 0);

    /* ── ٢) البوكس: عدّ الأكياس وتطبيق المستويات (من الإعدادات) ── */
    const boxLines = lines.filter((l) => l.boxGroup != null && l.isCoffee && l.variant === "G250");
    const bags = boxLines.reduce((t, l) => t + l.qty, 0);
    const boxSubtotal = boxLines.reduce((t, l) => t + l.lineTotal, 0);
    const tiers = (settings.boxTiers ?? []) as { bags: number; rewardType: string; value?: number }[];
    let boxPct = 0,
      freeDeliveryBox = false,
      giftEligible = false;
    for (const t of tiers)
      if (bags >= t.bags) {
        if (t.rewardType === "PERCENT") boxPct = Math.max(boxPct, t.value ?? 0);
        if (t.rewardType === "FREE_DELIVERY") freeDeliveryBox = true;
        if (t.rewardType === "GIFT") giftEligible = true;
      }
    const quantityDiscount = Math.round((boxSubtotal * boxPct) / 100);
    const itemsSubtotal = grossSubtotal - quantityDiscount;

    /* هدية البوكس (٦+): يختارها الزبون من هدايا اللوحة */
    if (giftEligible) {
      const gifts = await tx.select().from(s.boxGifts).where(eq(s.boxGifts.active, true)).orderBy(asc(s.boxGifts.sort));
      if (gifts.length) {
        const chosen = gifts.find((g) => g.name === input.boxGiftChoice) ?? gifts[0];
        lines.push({
          productId: null, name: `هدية البوكس: ${chosen.name}`, variant: "GIFT",
          unitPrice: 0, qty: 1, gramsTotal: 0, lineTotal: 0,
          boxGroup: boxLines[0]?.boxGroup ?? null, isGift: true, isCoffee: false,
        });
      }
    }

    /* ── ٣) كود الخصم العام ── */
    let couponDiscount = 0,
      freeDeliveryCoupon = false,
      coupon: typeof s.coupons.$inferSelect | null = null;
    if (input.couponCode?.trim()) {
      const code = input.couponCode.trim().toUpperCase();
      const [c] = await tx.select().from(s.coupons).where(eq(s.coupons.code, code)).for("update");
      const now = new Date();
      if (!c || !c.active) throw new Error("الكود غير صالح");
      if (c.expiresAt && c.expiresAt < now) throw new Error("الكود منتهي");
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new Error("الكود استُنفد");
      if (c.targetPhone && c.targetPhone !== phone) throw new Error("الكود غير مخصص لهذا الرقم");
      if (c.perCustomerLimit != null) {
        const used = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(s.couponUsages)
          .where(and(eq(s.couponUsages.couponCode, code), eq(s.couponUsages.customerPhone, phone)));
        if (used[0].n >= c.perCustomerLimit) throw new Error("استخدمت هذا الكود سابقاً");
      }
      coupon = c;
      if (c.type === "PERCENT") couponDiscount = Math.round((itemsSubtotal * c.value) / 100);
      else if (c.type === "FIXED") couponDiscount = Math.min(c.value, itemsSubtotal);
      else freeDeliveryCoupon = true;
    }

    /* ── ٤) رحلة المكافآت: مكافأة هذا الطلب = مستوى (عدد الطلبات المكتملة) ── */
    const { customer } = await settleLoyalty(tx, phone);
    let journeyDiscount = 0,
      freeDeliveryJourney = false,
      journeyGiftName: string | null = null,
      journeyRewardType: "PERCENT" | "FIXED" | "FREE_DELIVERY" | "GIFT" | null = null,
      appliedLevel = 0;
    if (customer?.journeyActive && customer.journeyOrders >= 1 && customer.journeyOrders <= 6) {
      const [lvl] = await tx
        .select()
        .from(s.journeyLevels)
        .where(and(eq(s.journeyLevels.level, customer.journeyOrders), eq(s.journeyLevels.active, true)));
      if (lvl) {
        appliedLevel = lvl.level;
        journeyRewardType = lvl.rewardType;
        if (lvl.rewardType === "PERCENT") journeyDiscount = Math.round((itemsSubtotal * lvl.value) / 100);
        else if (lvl.rewardType === "FIXED") journeyDiscount = Math.min(lvl.value, itemsSubtotal - couponDiscount);
        else if (lvl.rewardType === "FREE_DELIVERY") freeDeliveryJourney = true;
        else {
          journeyGiftName = lvl.giftName ?? "هدية";
          lines.push({
            productId: null, name: `مكافأة الرحلة: ${journeyGiftName}`, variant: "GIFT",
            unitPrice: 0, qty: 1, gramsTotal: 0, lineTotal: 0,
            boxGroup: null, isGift: true, isCoffee: false,
          });
        }
      }
    }

    /* ── ٥) رصيد النقاط — منطق العملة العراقية (أصغر ورقة = ٢٥٠):
       نستخدم أكبر جزء من الرصيد يجعل الإجمالي النهائي رقماً قابلاً للدفع تماماً،
       والباقي يبقى بحساب الزبون · أي كسر متبقٍ يُقرَّب لأعلى بصمت (لا خسارة على المتجر) ── */
    let pointsUsedDinars = 0,
      pointsUsedCount = 0;
    const afterDiscounts = itemsSubtotal - couponDiscount - journeyDiscount;

    /* ── ٦) التوصيل: سعر موحّد للزبون · التكلفة حسب المحافظة (داخلي) ── */
    const freeDelivery = freeDeliveryBox || freeDeliveryJourney || freeDeliveryCoupon;
    const deliveryCharged = freeDelivery ? 0 : settings.deliveryCustomerPrice;
    const isBasra = input.governorate.includes("بصرة");
    const deliveryCost = isBasra ? internal.deliveryCostBasra : internal.deliveryCostOther;
    const deliveryNet = deliveryCharged - deliveryCost;

    /* استخدام النقاط على الإجمالي شامل التوصيل — حتى يهبط لرقم يُدفع بالورق */
    if (input.usePoints && customer && customer.pointsBalance > 0) {
      const preTotal = Math.max(0, afterDiscounts) + deliveryCharged;
      const budget = Math.min(customer.pointsBalance * settings.pointValue, preTotal);
      const step = settings.pointValue; // النقطة لا تتجزأ
      let d = Math.floor(budget / step) * step;
      let best = -1;
      while (d >= 0) {
        if ((preTotal - d) % 250 === 0) { best = d; break; }
        d -= step;
      }
      // إن تعذّرت المطابقة التامة: خذ الأقصى والكسر يتقرّب لأعلى بصمت
      pointsUsedDinars = best >= 0 ? best : Math.floor(budget / step) * step;
      pointsUsedCount = pointsUsedDinars / step;
    }

    /* ── ٧) الإجمالي + التقريب لأعلى ٢٥٠ (مخفي عن الزبون) ── */
    const totalRaw = afterDiscounts - pointsUsedDinars + deliveryCharged;
    const total = roundUp250(totalRaw);

    /* ── ٨) نقاط الكسب: على صافي المنتجات بعد الخصومات وقبل التوصيل ── */
    const pointsEarned = Math.floor(Math.max(0, afterDiscounts) / settings.cashbackPerAmount);

    /* ── ٩) رقم الطلب التسلسلي + إدراج الطلب ── */
    const seq = await tx.execute(sql`SELECT nextval('khazf_order_seq')::int AS n`);
    const orderNumber = `KHZ-${(seq.rows[0] as { n: number }).n}`;

    /* upsert الزبون + تقدّم الرحلة + تجديد الصلاحية */
    const validity = new Date(Date.now() + settings.loyaltyValidityDays * 86400_000);
    const nextJourneyOrders = customer
      ? customer.journeyActive
        ? Math.min(customer.journeyOrders + 1, 6)
        : customer.journeyOrders
      : 1; // زبون جديد: طلبه الأول يفتح المستوى ١
    const journeyStillActive = appliedLevel === 6 ? false : (customer?.journeyActive ?? true);
    await tx
      .insert(s.customers)
      .values({
        phone, name: input.name, governorate: input.governorate, address: input.address,
        email: input.email || null, marketingOptIn: !!input.marketingOptIn,
        journeyOrders: 1, loyaltyExpiresAt: validity, lastOrderAt: new Date(),
      })
      .onConflictDoUpdate({
        target: s.customers.phone,
        set: {
          name: input.name, governorate: input.governorate, address: input.address,
          email: input.email || null, marketingOptIn: !!input.marketingOptIn,
          journeyOrders: nextJourneyOrders, journeyActive: journeyStillActive,
          loyaltyExpiresAt: validity, lastOrderAt: new Date(),
        },
      });

    const [order] = await tx
      .insert(s.orders)
      .values({
        orderNumber, customerPhone: phone,
        name: input.name, phone, email: input.email || null,
        governorate: input.governorate, address: input.address, note: input.note || null,
        itemsSubtotal, quantityDiscount,
        couponCode: coupon?.code ?? null, couponDiscount,
        journeyRewardType, journeyGiftName, journeyDiscount,
        pointsUsed: pointsUsedDinars,
        deliveryCharged, deliveryCost, deliveryNet,
        totalRaw, total, pointsEarned,
      })
      .returning();

    /* ── ١٠) خصم المخزون FIFO + الأسطر + الربح ── */
    let productProfit = 0;
    for (const l of lines) {
      let breakdown: { batchId: number; qty: number; unitCost: number }[] | null = null;
      if (l.productId != null) {
        const need0 = l.isCoffee ? l.gramsTotal : l.qty;
        if (need0 > 0) {
          const batches = await tx
            .select()
            .from(s.inventoryBatches)
            .where(eq(s.inventoryBatches.productId, l.productId))
            .orderBy(asc(s.inventoryBatches.receivedAt))
            .for("update");
          let need = need0,
            cost = 0;
          breakdown = [];
          for (const b of batches) {
            if (need <= 0) break;
            const take = Math.min(need, b.qtyRemaining);
            if (take <= 0) continue;
            const perUnit = l.isCoffee
              ? ((b.importCostPerKilo ?? 0) + (b.shipCostPerKilo ?? 0) + (b.packCostPerKilo ?? 0)) / 1000
              : (b.costPerPiece ?? 0);
            cost += take * perUnit;
            breakdown.push({ batchId: b.id, qty: take, unitCost: Math.round(perUnit * 100) / 100 });
            await tx
              .update(s.inventoryBatches)
              .set({ qtyRemaining: b.qtyRemaining - take })
              .where(eq(s.inventoryBatches.id, b.id));
            need -= take;
          }
          if (need > 0) throw new Error(`المخزون لا يكفي: ${l.name} — الطلب أُلغي بالكامل`);
          await tx.insert(s.inventoryMovements).values({
            productId: l.productId, batchId: breakdown[0]?.batchId ?? null,
            type: "SALE", qtyDelta: -need0, orderId: order.id, reason: orderNumber,
          });
          productProfit += l.lineTotal - Math.round(cost);
        }
      }
      await tx.insert(s.orderItems).values({
        orderId: order.id, productId: l.productId, nameSnapshot: l.name,
        variant: l.variant, unitPrice: l.unitPrice, qty: l.qty,
        gramsTotal: l.gramsTotal, lineTotal: l.lineTotal,
        boxGroup: l.boxGroup, isGift: l.isGift, batchBreakdown: breakdown,
      });
    }
    /* خصم البوكس يوزَّع محاسبياً على الربح الكلي */
    productProfit -= quantityDiscount + couponDiscount + journeyDiscount;
    await tx.update(s.orders).set({ productProfit }).where(eq(s.orders.id, order.id));

    /* ── ١١) قيود الاستخدام: نقاط + كود ── */
    if (pointsUsedCount > 0) {
      await tx.insert(s.cashbackLedger).values({
        customerPhone: phone, orderId: order.id, type: "USE",
        points: pointsUsedCount, note: orderNumber,
      });
      await tx
        .update(s.customers)
        .set({ pointsBalance: sql`GREATEST(points_balance - ${pointsUsedCount}, 0)` })
        .where(eq(s.customers.phone, phone));
    }
    if (coupon) {
      await tx.insert(s.couponUsages).values({ couponCode: coupon.code, customerPhone: phone, orderId: order.id });
      await tx.update(s.coupons).set({ usedCount: sql`used_count + 1` }).where(eq(s.coupons.code, coupon.code));
    }

    /* ── ١٢) رسالة مكافأة الطلب القادم (لصفحة النجاح — مرة واحدة) ── */
    let nextRewardMessage: string | null = null;
    if (journeyStillActive && nextJourneyOrders >= 1 && nextJourneyOrders <= 6) {
      const [nl] = await tx
        .select()
        .from(s.journeyLevels)
        .where(and(eq(s.journeyLevels.level, nextJourneyOrders), eq(s.journeyLevels.active, true)));
      if (nl)
        nextRewardMessage =
          nl.rewardType === "PERCENT"
            ? `مبروك! حصلت على خصم ${nl.value}٪ لطلبك القادم`
            : nl.rewardType === "FREE_DELIVERY"
              ? "مبروك! توصيلك القادم مجاني"
              : nl.rewardType === "FIXED"
                ? `مبروك! خصم ${nl.value} د.ع لطلبك القادم`
                : `مبروك! حصلت على هدية «${nl.giftName}» مع طلبك القادم`;
    }

    return {
      orderId: order.id,
      orderNumber,
      total,
      pointsEarned,
      pointsUsedDinars,
      deliveryCharged,
      nextRewardMessage,
      appliedJourney: journeyRewardType
        ? { level: appliedLevel, type: journeyRewardType, giftName: journeyGiftName, discount: journeyDiscount }
        : null,
      boxSummary: bags >= (tiers[0]?.bags ?? 3) ? { bags, pct: boxPct, freeDelivery: freeDeliveryBox, gift: giftEligible } : null,
    };
  });
}
