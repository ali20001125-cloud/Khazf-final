/**
 * محرك الطلبات ⭐ — كل الحساب بالخادم داخل Transaction واحدة (القسم ٨)
 * لا ثقة بأي رقم من المتصفح: الأسعار والخصومات تُحسب من القاعدة حصراً
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { settleLoyalty } from "./loyalty";
import { randomBytes } from "crypto";

export type CheckoutItem = {
  slug: string;
  variant: "G250" | "G500" | "G1000" | "PIECE";
  qty: number;
  grind?: string;
  boxGroup?: number | null;
  variantId?: number | null;   // خيار المنتج (مقاس/عبوة/لون) إن وُجد
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

    /* خيارات المنتجات المطلوبة (مقاس/عبوة/لون) */
    const wantedVariantIds = [...new Set(input.items.map((i) => i.variantId).filter((x): x is number => !!x))];
    const variantRows = wantedVariantIds.length > 0
      ? await tx.select().from(s.productVariants).where(
          sql`${s.productVariants.id} IN (${sql.join(wantedVariantIds.map((x) => sql`${x}`), sql`, `)})`)
      : [];
    const byVariantId = new Map(variantRows.map((v) => [v.id, v]));

    type Line = {
      productId: number | null;
      variantId?: number | null;
      image?: string | null;
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
      // خيار المنتج (إن اختير): سعره ومخزونه يسبقان سعر المنتج العام
      const chosen = it.variantId ? byVariantId.get(it.variantId) : undefined;
      if (it.variantId && (!chosen || chosen.productId !== p.id || !chosen.active))
        throw new Error(`الخيار غير متاح لـ${p.name}`);
      if (chosen && chosen.stock < qty)
        throw new Error(`الكمية غير متوفرة: ${p.name} · ${chosen.label}`);

      const price = chosen
        ? (chosen.salePrice ?? chosen.price ?? p.salePrice ?? p.pricePiece)
        : it.variant === "PIECE"
          ? (p.salePrice ?? p.pricePiece)
          : it.variant === "G250"
            ? p.priceG250
            : it.variant === "G500"
              ? p.priceG500
              : p.priceG1000;
      if (price == null) throw new Error(`الوزن غير متاح لـ${p.name}`);
      lines.push({
        productId: p.id,
        variantId: chosen?.id ?? null,
        image: chosen?.image ?? p.images?.[0] ?? null,
        name: p.name + (chosen ? ` · ${chosen.label}` : "") + (it.grind ? ` · ${it.grind}` : ""),
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

    /* ── ٤) رحلة المكافآت: مكافأة هذا الطلب = المستوى الحالي (الطلب رقم N ياخذ مكافأة المستوى N) ── */
    const { customer } = await settleLoyalty(tx, phone);
    // الرحلة مفعّلة افتراضياً (دائمة، تتكرّر كل 6). تُعطّل فقط إن journeyActive=false صراحةً.
    const journeyOn = customer ? customer.journeyActive : true;
    const completedOrders = customer?.journeyOrders ?? 0;
    const currentLevel = journeyOn ? ((completedOrders % 6) + 1) : 0; // 0 = لا مكافأة
    let journeyDiscount = 0,
      freeDeliveryJourney = false,
      journeyGiftName: string | null = null,
      journeyRewardType: "PERCENT" | "FIXED" | "FREE_DELIVERY" | "GIFT" | null = null,
      appliedLevel = 0,
      journeyPctValue = 0;
    if (currentLevel >= 1 && currentLevel <= 6) {
      const [lvl] = await tx
        .select()
        .from(s.journeyLevels)
        .where(and(eq(s.journeyLevels.level, currentLevel), eq(s.journeyLevels.active, true)));
      if (lvl) {
        appliedLevel = lvl.level;
        journeyRewardType = lvl.rewardType;
        if (lvl.rewardType === "PERCENT") { journeyPctValue = lvl.value; journeyDiscount = Math.ceil((itemsSubtotal * lvl.value) / 100 / 250) * 250; }
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
    const thresholdMet = (settings.freeDeliveryThreshold ?? 0) > 0 && itemsSubtotal >= settings.freeDeliveryThreshold;
    // أول طلب لكل زبون توصيله مجاني (سياسة معلنة للجميع)
    const isFirstOrder = settings.freeDeliveryFirstOrder && !customer
      && itemsSubtotal >= (settings.freeDeliveryFirstMin ?? 0);
    const freeDelivery = freeDeliveryBox || freeDeliveryJourney || freeDeliveryCoupon || thresholdMet || isFirstOrder;
    const deliveryCharged = freeDelivery ? 0 : settings.deliveryCustomerPrice;
    const isBasra = input.governorate.includes("بصرة");
    const deliveryCost = isBasra ? internal.deliveryCostBasra : internal.deliveryCostOther;
    const deliveryNet = deliveryCharged - deliveryCost;

    /* استخدام الكاش (بالدنانير مباشرة) — بمضاعفات ٢٥٠، الباقي يبقى بالحساب */
    if (input.usePoints && customer && customer.pointsBalance > 0) {
      const preTotal = Math.max(0, afterDiscounts) + deliveryCharged;
      // الرصيد بالدنانير مباشرة (pointValue = 1)
      const available = customer.pointsBalance * settings.pointValue;
      const cap = Math.min(available, preTotal);
      // يُستخدم بمضاعفات ٢٥٠ دينار — أكبر مضاعف لا يتجاوز الرصيد ولا الإجمالي
      pointsUsedDinars = Math.floor(cap / 250) * 250;
      pointsUsedCount = pointsUsedDinars / settings.pointValue; // = الدنانير نفسها (pointValue=1)
    }

    /* ── ٧) الإجمالي + التقريب لأعلى ٢٥٠ (مخفي عن الزبون) ── */
    const totalRaw = afterDiscounts - pointsUsedDinars + deliveryCharged;
    const total = roundUp250(totalRaw);

    /* ── ٨) كسب الكاش (بالدنانير): ٣٠ د لكل ١٠٠٠ د منفقة (٣٪) على المنتجات المدفوعة فعلاً،
       بعد كل الخصومات والكاش المستخدم، قبل التوصيل — لا كاش على مبلغ مدفوع بالكاش ── */
    const earnBase = Math.max(0, afterDiscounts - pointsUsedDinars);
    const pointsEarned = Math.floor(earnBase / settings.cashbackPerAmount) * settings.pointValue;

    /* ── ٩) رقم الطلب التسلسلي + إدراج الطلب ── */
    /* رقم داخلي متسلسل (للمالك) — يُحسب من الطلبات الفعلية لا من عدّاد،
       لأن عدّاد PostgreSQL يتقدّم حتى لو فشلت المحاولة فتظهر قفزات */
    const seqRow = await tx.execute(sql`SELECT COALESCE(MAX(seq_no), 0) + 1 AS n FROM orders`);
    const seqNo = (seqRow.rows[0] as { n: number }).n;
    /* رقم فاتورة قافز (للزبون) — يقفز ١٣..٤٧ فوق آخر رقم، يبدأ من ١٠٠٠+ */
    const lastRow = await tx.execute(sql`SELECT COALESCE(MAX((regexp_replace(order_number,'\\D','','g'))::int),1000) AS m FROM orders`);
    const lastInv = (lastRow.rows[0] as { m: number }).m;
    const jump = 13 + Math.floor(Math.random() * 35);
    const orderNumber = `KHZ-${lastInv + jump}`;

    /* upsert الزبون + تقدّم الرحلة + تجديد الصلاحية */
    const validity = new Date(Date.now() + settings.loyaltyValidityDays * 86400_000);
    // عدد الطلبات المكتملة يزيد ١ بعد هذا الطلب · الرحلة تبقى فعّالة دائماً (تتكرّر)
    const nextJourneyOrders = completedOrders + 1;
    const journeyStillActive = true; // الرحلة دائمة — تتجدّد كل ٦ طلبات
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
        orderNumber, seqNo, customerPhone: phone,
        name: input.name, phone, email: input.email || null,
        governorate: input.governorate, address: input.address, note: input.note || null,
        itemsSubtotal, quantityDiscount,
        couponCode: coupon?.code ?? null, couponDiscount,
        journeyRewardType, journeyGiftName, journeyDiscount,
        pointsUsed: pointsUsedDinars,
        deliveryCharged, deliveryCost, deliveryNet,
        totalRaw, total, pointsEarned,
        reviewToken: randomBytes(12).toString("base64url"), // رمز آمن للتقييم
      })
      .returning();

    /* ── ١٠) خصم المخزون FIFO + الأسطر + الربح ── */
    let productProfit = 0;
    for (const l of lines) {
      // خصم مخزون الخيار (مقاس/عبوة/لون) — مستقل عن وجبات FIFO
      if (l.variantId) {
        await tx.update(s.productVariants)
          .set({ stock: sql`GREATEST(${s.productVariants.stock} - ${l.qty}, 0)` })
          .where(eq(s.productVariants.id, l.variantId));
      }
      let breakdown: { batchId: number; qty: number; unitCost: number }[] | null = null;
      if (l.productId != null) {
        /* الأدوات التي مخزونها من الخيارات أو من حقل المخزون العام
           لا تُخصم من الوجبات — خُصمت أعلاه من الخيار، أو تُخصم هنا من الحقل العام */
        if (!l.isCoffee) {
          const prod = products.find((p) => p.id === l.productId);
          const hasBatches = await tx.execute(sql`
            SELECT COALESCE(SUM(qty_remaining),0)::int AS q
            FROM inventory_batches WHERE product_id = ${l.productId}`);
          const batchQty = (hasBatches.rows[0] as { q: number }).q;

          if (l.variantId) {
            // خُصم من الخيار سابقاً — نسجّل الحركة ونحسب الربح من تكلفة الخيار
            const v = byVariantId.get(l.variantId);
            const unitCost = v?.costPrice ?? prod?.costPiece ?? 0;
            productProfit += l.lineTotal - Math.round(unitCost * l.qty);
            await tx.insert(s.orderItems).values({
              orderId: order.id, productId: l.productId, nameSnapshot: l.name,
              variant: l.variant, unitPrice: l.unitPrice, qty: l.qty,
              gramsTotal: l.gramsTotal, lineTotal: l.lineTotal,
              boxGroup: l.boxGroup, isGift: l.isGift, batchBreakdown: null,
            });
            continue;
          }

          if (batchQty === 0 && prod?.stockPieces != null) {
            // مخزون عام بلا وجبات
            if (prod.stockPieces < l.qty)
              throw new Error(`المخزون لا يكفي: ${l.name} — الطلب أُلغي بالكامل`);
            await tx.update(s.products)
              .set({ stockPieces: prod.stockPieces - l.qty })
              .where(eq(s.products.id, l.productId));
            const unitCost = prod.costPiece ?? 0;
            productProfit += l.lineTotal - Math.round(unitCost * l.qty);
            await tx.insert(s.orderItems).values({
              orderId: order.id, productId: l.productId, nameSnapshot: l.name,
              variant: l.variant, unitPrice: l.unitPrice, qty: l.qty,
              gramsTotal: l.gramsTotal, lineTotal: l.lineTotal,
              boxGroup: l.boxGroup, isGift: l.isGift, batchBreakdown: null,
            });
            continue;
          }
        }

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
    const nextLevel = (nextJourneyOrders % 6) + 1; // مكافأة الطلب القادم بالدورة
    {
      const [nl] = await tx
        .select()
        .from(s.journeyLevels)
        .where(and(eq(s.journeyLevels.level, nextLevel), eq(s.journeyLevels.active, true)));
      if (nl) {
        const reward =
          nl.rewardType === "PERCENT" ? `خصم ${nl.value}٪`
          : nl.rewardType === "FREE_DELIVERY" ? "توصيل مجّاني"
          : nl.rewardType === "FIXED" ? `خصم ${nl.value.toLocaleString("en")} د.ع`
          : `هديّة «${nl.giftName}»`;
        // زبون جديد (أوّل طلب): نحتفي ببداية الرحلة
        nextRewardMessage = !customer
          ? `بدأت رحلتك مع خزف 🎉 طلبك القادم يحمل لك ${reward}`
          : `أحسنت! طلبك القادم يحمل لك ${reward}`;
      }
    }

    return {
      orderId: order.id,
      orderNumber,
      seqNo,
      items: lines.map((l) => ({
        nameSnapshot: l.name, qty: l.qty, lineTotal: l.lineTotal,
        image: l.image ?? null,
      })),
      total,
      itemsSubtotal,
      journeyDiscount,
      journeyPct: journeyPctValue,
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
