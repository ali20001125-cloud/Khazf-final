/**
 * مخطط قاعدة بيانات خزف — المصدر الوحيد للحقيقة
 * ─────────────────────────────────────────────
 * القواعد الحاكمة (من ADMIN-PHILOSOPHY + LESSONS-FROM-V1):
 * • القهوة بالغرام حصراً · الأدوات بالقطعة — لا حقول موازية
 * • الرصيد محسوب من الوجبات (لا حقل مخزون على المنتج)
 * • كل الأسعار يدوية (لا ×4 ولا ×0.8)
 * • كل معلومة لها مصدر واحد فقط
 */

import {
  pgTable, pgEnum, serial, integer, smallint, text, boolean,
  timestamp, jsonb, primaryKey, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ═══════════════ Enums ═══════════════ */

export const productType = pgEnum("product_type", ["COFFEE", "TOOL"]);
export const oosBehavior = pgEnum("oos_behavior", ["HIDE", "SHOW_BADGE"]); // سلوك النفاد لكل منتج
export const orderStatus = pgEnum("order_status", ["CONFIRMED", "DELIVERED", "CANCELLED"]); // حالتان + إلغاء إداري (يرجّع المخزون)
export const movementType = pgEnum("movement_type", ["IN", "SALE", "ADJUSTMENT", "CANCEL_RETURN"]);
export const orderItemVariant = pgEnum("order_item_variant", ["G250", "G500", "G1000", "PIECE", "GIFT"]);
export const couponType = pgEnum("coupon_type", ["PERCENT", "FIXED", "FREE_DELIVERY"]);
export const rewardType = pgEnum("reward_type", ["PERCENT", "FIXED", "FREE_DELIVERY", "GIFT"]);
export const reviewStatus = pgEnum("review_status", ["PENDING", "PUBLISHED", "HIDDEN"]);
export const ledgerType = pgEnum("ledger_type", ["EARN", "USE", "EXPIRE", "MANUAL"]);

/* ═══════════════ الإدارة ═══════════════ */

/** المدراء المصرّح لهم — يُربطون بحساب Supabase Auth */
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  authUserId: text("auth_user_id").unique(), // auth.uid() — يُملأ عند أول ربط
  email: text("email").unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ═══════════════ أماكن الظهور والأصناف ═══════════════ */

/** أماكن الظهور — اللوحة لا تعرف الصفحات؛ المتجر يبني صفحاته من هذه الإشارات */
export const places = pgTable("places", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // home | coffee | espresso_tools | drip_tools | box
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  showInNav: boolean("show_in_nav").notNull().default(true),
});

/** الأصناف الفرعية للأدوات (مطاحن، أقماع…) — قابلة للإدارة الكاملة */
export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/* ═══════════════ المنتجات ═══════════════ */

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    type: productType("type").notNull(),
    active: boolean("active").notNull().default(true),
    name: text("name").notNull(),
    latinName: text("latin_name"),
    description: text("description"),
    trigger: text("trigger"), // جملة "لمن هذه القهوة" — يراجعها المالك
    badge: text("badge"), // "الأكثر مبيعاً" | "جديد" | "مميّز" — نص حر اختياري
    featured: boolean("featured").notNull().default(false), // الأكثر طلباً (الوضع اليدوي)

    /* — حقول القهوة (null للأدوات) — */
    country: text("country"),
    flag: text("flag"), // علم الدولة (الاستثناء الوحيد للإيموجي)
    latinOrigin: text("latin_origin"),
    region: text("region"),
    variety: text("variety"),
    process: text("process"),
    roast: text("roast"),
    altitude: text("altitude"),
    sca: smallint("sca"),
    notes: text("notes").array().notNull().default(sql`'{}'::text[]`), // الإيحاءات
    flavorAcidity: smallint("flavor_acidity"),   // ملف النكهة ١–٥
    flavorSweetness: smallint("flavor_sweetness"),
    flavorBody: smallint("flavor_body"),
    farm: text("farm"),   // يكتبها المالك إن أراد — لا بيانات مخترعة
    story: text("story"), // كذلك

    /* — الأسعار: كلها يدوية يكتبها المالك (ممنوع أي حساب آلي) — */
    priceG250: integer("price_g250"),
    priceG500: integer("price_g500"),
    priceG1000: integer("price_g1000"),
    pricePiece: integer("price_piece"), // للأدوات

    /* — الأدوات — */
    subcategoryId: integer("subcategory_id").references(() => subcategories.id, { onDelete: "set null" }),

    /* — سلوك المخزون (الرصيد نفسه محسوب من الوجبات — لا حقل هنا) — */
    stockThreshold: integer("stock_threshold").notNull().default(0), // غرام للقهوة، قطعة للأدوات
    oosBehavior: oosBehavior("oos_behavior").notNull().default("SHOW_BADGE"),
    allowInBox: boolean("allow_in_box").notNull().default(false),

    images: text("images").array().notNull().default(sql`'{}'::text[]`), // مسارات Supabase Storage
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("products_active_idx").on(t.active),
    index("products_type_idx").on(t.type),
  ]
);

/** منتج ↔ أماكن ظهور (المطحنة تظهر بالإسبريسو والتقطير معاً) */
export const productPlaces = pgTable(
  "product_places",
  {
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    placeId: integer("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.placeId] })]
);

/* ═══════════════ المخزون — وجبات FIFO + سجل حركات ═══════════════ */

/** وجبة استلام: الكمية + تكلفتها (التكلفة هنا فقط — لا على المنتج) */
export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    qtyReceived: integer("qty_received").notNull(),   // غرام للقهوة · قطعة للأدوات
    qtyRemaining: integer("qty_remaining").notNull(), // يتناقص بالبيع FIFO
    /* تكاليف الكيلو (قهوة): استيراد + توصيل + تغليف */
    importCostPerKilo: integer("import_cost_per_kilo"),
    shipCostPerKilo: integer("ship_cost_per_kilo"),
    packCostPerKilo: integer("pack_cost_per_kilo"),
    costPerPiece: integer("cost_per_piece"), // للأدوات
    note: text("note"),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("batches_fifo_idx").on(t.productId, t.receivedAt)]
);

/** سجل كل حركة مخزون — بيع/استلام/تعديل يدوي/إرجاع إلغاء */
export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    batchId: integer("batch_id").references(() => inventoryBatches.id, { onDelete: "set null" }),
    type: movementType("type").notNull(),
    qtyDelta: integer("qty_delta").notNull(), // موجب للإضافة، سالب للخصم
    orderId: integer("order_id"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("movements_product_idx").on(t.productId, t.createdAt)]
);

/* ═══════════════ العملاء (المعرّف = رقم الهاتف) ═══════════════ */

export const customers = pgTable("customers", {
  phone: text("phone").primaryKey(), // 07XXXXXXXXX
  authUserId: text("auth_user_id").unique(), // يُربط عند OTP (الدفعة ٢)
  name: text("name").notNull(),
  governorate: text("governorate").notNull(),
  address: text("address").notNull(),
  email: text("email"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  adminNotes: text("admin_notes"), // لا يراها الزبون

  /* الولاء — كاش (مصدره ledger؛ يُحدَّث داخل نفس الـTransaction) */
  pointsBalance: integer("points_balance").notNull().default(0),
  journeyOrders: integer("journey_orders").notNull().default(0), // 0..6 طلبات الدورة الحالية
  journeyActive: boolean("journey_active").notNull().default(true),
  loyaltyExpiresAt: timestamp("loyalty_expires_at", { withTimezone: true }),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const favorites = pgTable(
  "favorites",
  {
    customerPhone: text("customer_phone").notNull().references(() => customers.phone, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.customerPhone, t.productId] })]
);

/* ═══════════════ الطلبات ═══════════════ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(), // KHZ-1001 (تسلسل قاعدة بيانات)
    customerPhone: text("customer_phone").notNull().references(() => customers.phone, { onDelete: "restrict" }),
    /* لقطة بيانات التوصيل وقت الطلب */
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    governorate: text("governorate").notNull(),
    address: text("address").notNull(),
    note: text("note"),

    /* الحساب (يُحسب بالخادم داخل Transaction — القسم ٨) */
    itemsSubtotal: integer("items_subtotal").notNull(),      // بعد خصم الكمية
    quantityDiscount: integer("quantity_discount").notNull().default(0), // خصم البوكس
    couponCode: text("coupon_code"),
    couponDiscount: integer("coupon_discount").notNull().default(0),
    journeyRewardType: rewardType("journey_reward_type"),
    journeyGiftName: text("journey_gift_name"),
    journeyDiscount: integer("journey_discount").notNull().default(0),
    pointsUsed: integer("points_used").notNull().default(0), // بالدينار (نقطة=٣٠ محسوبة مسبقاً)
    deliveryCharged: integer("delivery_charged").notNull(),  // ما دفعه الزبون (0 لو مجاني)
    deliveryCost: integer("delivery_cost").notNull(),        // تكلفة الشركة (بصرة/غيرها — قابل للتعديل)
    deliveryNet: integer("delivery_net").notNull(),          // الفرق
    totalRaw: integer("total_raw").notNull(),                // قبل التقريب (داخلي)
    total: integer("total").notNull(),                       // المقرَّب لأعلى ٢٥٠ — ما يراه الزبون
    productProfit: integer("product_profit").notNull().default(0), // من تكاليف وجبات FIFO
    pointsEarned: integer("points_earned").notNull().default(0),

    status: orderStatus("status").notNull().default("CONFIRMED"),
    notifiedTelegram: boolean("notified_telegram").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_customer_idx").on(t.customerPhone, t.createdAt),
    index("orders_status_idx").on(t.status),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    nameSnapshot: text("name_snapshot").notNull(),
    variant: orderItemVariant("variant").notNull(),
    unitPrice: integer("unit_price").notNull(), // 0 للهدايا
    qty: integer("qty").notNull(),
    gramsTotal: integer("grams_total").notNull().default(0), // إجمالي غرامات السطر (0 للأدوات/الهدايا غير القهوة)
    lineTotal: integer("line_total").notNull(),
    boxGroup: integer("box_group"), // أسطر نفس البوكس تحمل نفس الرقم
    isGift: boolean("is_gift").notNull().default(false),
    /* تدقيق الربح: من أي وجبات خُصم وبأي تكلفة */
    batchBreakdown: jsonb("batch_breakdown").$type<{ batchId: number; qty: number; unitCost: number }[]>(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

/* ═══════════════ الأكواد العامة ═══════════════ */

export const coupons = pgTable("coupons", {
  code: text("code").primaryKey(),
  type: couponType("type").notNull(),
  value: integer("value").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  perCustomerLimit: integer("per_customer_limit"),
  targetPhone: text("target_phone"), // كود موجّه لعميل معيّن
  active: boolean("active").notNull().default(true),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponUsages = pgTable(
  "coupon_usages",
  {
    id: serial("id").primaryKey(),
    couponCode: text("coupon_code").notNull().references(() => coupons.code, { onDelete: "cascade" }),
    customerPhone: text("customer_phone").notNull(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("coupon_order_uq").on(t.couponCode, t.orderId)]
);

/* ═══════════════ الولاء ═══════════════ */

/** سجل النقاط — المصدر؛ EARN تصبح متاحة بعد availableAt (٤٨ ساعة من التوصيل) */
export const cashbackLedger = pgTable(
  "cashback_ledger",
  {
    id: serial("id").primaryKey(),
    customerPhone: text("customer_phone").notNull().references(() => customers.phone, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    type: ledgerType("type").notNull(),
    points: integer("points").notNull(), // موجب دائماً؛ الاتجاه من type
    availableAt: timestamp("available_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ledger_customer_idx").on(t.customerPhone, t.createdAt)]
);

/** رحلة المكافآت — ٦ مستويات يعدّلها المالك */
export const journeyLevels = pgTable("journey_levels", {
  level: integer("level").primaryKey(), // 1..6
  rewardType: rewardType("reward_type").notNull(),
  value: integer("value").notNull().default(0), // نسبة أو مبلغ حسب النوع
  giftName: text("gift_name"),
  active: boolean("active").notNull().default(true),
});

/** هدايا البوكس (مستوى ٦ أكياس) — يديرها المالك */
export const boxGifts = pgTable("box_gifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/* ═══════════════ التقييمات ═══════════════ */

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    customerPhone: text("customer_phone").references(() => customers.phone, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    verified: boolean("verified").notNull().default(false), // شراء موثّق (تحقق فعلي من طلب مُسلَّم)
    status: reviewStatus("status").notNull().default("PENDING"),
    reply: text("reply"), // رد المتجر
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reviews_product_idx").on(t.productId, t.status)]
);

/* ═══════════════ البنرات + الإعدادات ═══════════════ */

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  image: text("image"),
  promoText: text("promo_text"),
  promoLink: text("promo_link"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
});

export type BoxTier = { bags: number; rewardType: "PERCENT" | "FREE_DELIVERY" | "GIFT"; value?: number };

/** إعدادات عامة (يقرؤها المتجر) — صف واحد id=1 */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  storeName: text("store_name").notNull().default("خزف"),
  deliveryCustomerPrice: integer("delivery_customer_price").notNull().default(3000), // موحّد لكل العراق
  cashbackPerAmount: integer("cashback_per_amount").notNull().default(1000), // كل ١٠٠٠ د = نقطة
  pointValue: integer("point_value").notNull().default(30), // النقطة = ٣٠ د (٣٪)
  loyaltyValidityDays: integer("loyalty_validity_days").notNull().default(90),
  boxDiscountPct: integer("box_discount_pct").notNull().default(20),
  boxTiers: jsonb("box_tiers").$type<BoxTier[]>().notNull()
    .default(sql`'[{"bags":3,"rewardType":"PERCENT","value":10},{"bags":4,"rewardType":"PERCENT","value":20},{"bags":5,"rewardType":"FREE_DELIVERY"},{"bags":6,"rewardType":"GIFT"}]'::jsonb`),
  featuredMode: text("featured_mode").notNull().default("manual"), // manual | auto
  topBarMessages: text("top_bar_messages").array().notNull().default(sql`'{}'::text[]`),
  contactPhone: text("contact_phone"),
  instagram: text("instagram").default("khazf.roaster"),
  whatsapp: text("whatsapp"),
  logoUrl: text("logo_url"),
  metaPixelId: text("meta_pixel_id"),
  gaId: text("ga_id"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
});

/** إعدادات داخلية (المالك فقط — لا يراها المتجر): تكاليف الشركة + الإشعارات */
export const settingsInternal = pgTable("settings_internal", {
  id: integer("id").primaryKey().default(1),
  deliveryCostBasra: integer("delivery_cost_basra").notNull().default(0),
  deliveryCostOther: integer("delivery_cost_other").notNull().default(0),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  notifyNewOrder: boolean("notify_new_order").notNull().default(true),
  notifyLowStock: boolean("notify_low_stock").notNull().default(true),
  notifyNewReview: boolean("notify_new_review").notNull().default(true),
});

/* ═══════════════ العلاقات (للاستعلامات المريحة) ═══════════════ */

export const productsRelations = relations(products, ({ many, one }) => ({
  places: many(productPlaces),
  batches: many(inventoryBatches),
  movements: many(inventoryMovements),
  reviews: many(reviews),
  subcategory: one(subcategories, { fields: [products.subcategoryId], references: [subcategories.id] }),
}));

export const productPlacesRelations = relations(productPlaces, ({ one }) => ({
  product: one(products, { fields: [productPlaces.productId], references: [products.id] }),
  place: one(places, { fields: [productPlaces.placeId], references: [places.id] }),
}));

export const batchesRelations = relations(inventoryBatches, ({ one }) => ({
  product: one(products, { fields: [inventoryBatches.productId], references: [products.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  ledger: many(cashbackLedger),
  favorites: many(favorites),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerPhone], references: [customers.phone] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
