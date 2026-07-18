-- ═══ خزف: ملف الإعداد الكامل — لصقة واحدة وتشغيل ═══

CREATE TYPE "public"."coupon_type" AS ENUM('PERCENT', 'FIXED', 'FREE_DELIVERY');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('EARN', 'USE', 'EXPIRE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('IN', 'SALE', 'ADJUSTMENT', 'CANCEL_RETURN');--> statement-breakpoint
CREATE TYPE "public"."oos_behavior" AS ENUM('HIDE', 'SHOW_BADGE');--> statement-breakpoint
CREATE TYPE "public"."order_item_variant" AS ENUM('G250', 'G500', 'G1000', 'PIECE', 'GIFT');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('CONFIRMED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('COFFEE', 'TOOL');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('PERCENT', 'FIXED', 'FREE_DELIVERY', 'GIFT');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"email" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"image" text,
	"promo_text" text,
	"promo_link" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "box_gifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cashback_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_phone" text NOT NULL,
	"order_id" integer,
	"type" "ledger_type" NOT NULL,
	"points" integer NOT NULL,
	"available_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_usages" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_code" text NOT NULL,
	"customer_phone" text NOT NULL,
	"order_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"type" "coupon_type" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"usage_limit" integer,
	"per_customer_limit" integer,
	"target_phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"phone" text PRIMARY KEY NOT NULL,
	"auth_user_id" text,
	"name" text NOT NULL,
	"governorate" text NOT NULL,
	"address" text NOT NULL,
	"email" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"admin_notes" text,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"journey_orders" integer DEFAULT 0 NOT NULL,
	"journey_active" boolean DEFAULT true NOT NULL,
	"loyalty_expires_at" timestamp with time zone,
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"customer_phone" text NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_customer_phone_product_id_pk" PRIMARY KEY("customer_phone","product_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"qty_received" integer NOT NULL,
	"qty_remaining" integer NOT NULL,
	"import_cost_per_kilo" integer,
	"ship_cost_per_kilo" integer,
	"pack_cost_per_kilo" integer,
	"cost_per_piece" integer,
	"note" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"batch_id" integer,
	"type" "movement_type" NOT NULL,
	"qty_delta" integer NOT NULL,
	"order_id" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_levels" (
	"level" integer PRIMARY KEY NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"gift_name" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"name_snapshot" text NOT NULL,
	"variant" "order_item_variant" NOT NULL,
	"unit_price" integer NOT NULL,
	"qty" integer NOT NULL,
	"grams_total" integer DEFAULT 0 NOT NULL,
	"line_total" integer NOT NULL,
	"box_group" integer,
	"is_gift" boolean DEFAULT false NOT NULL,
	"batch_breakdown" jsonb
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_phone" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"governorate" text NOT NULL,
	"address" text NOT NULL,
	"note" text,
	"items_subtotal" integer NOT NULL,
	"quantity_discount" integer DEFAULT 0 NOT NULL,
	"coupon_code" text,
	"coupon_discount" integer DEFAULT 0 NOT NULL,
	"journey_reward_type" "reward_type",
	"journey_gift_name" text,
	"journey_discount" integer DEFAULT 0 NOT NULL,
	"points_used" integer DEFAULT 0 NOT NULL,
	"delivery_charged" integer NOT NULL,
	"delivery_cost" integer NOT NULL,
	"delivery_net" integer NOT NULL,
	"total_raw" integer NOT NULL,
	"total" integer NOT NULL,
	"product_profit" integer DEFAULT 0 NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"status" "order_status" DEFAULT 'CONFIRMED' NOT NULL,
	"notified_telegram" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"show_in_nav" boolean DEFAULT true NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_places" (
	"product_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	CONSTRAINT "product_places_product_id_place_id_pk" PRIMARY KEY("product_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"type" "product_type" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"latin_name" text,
	"description" text,
	"trigger" text,
	"badge" text,
	"featured" boolean DEFAULT false NOT NULL,
	"country" text,
	"flag" text,
	"latin_origin" text,
	"region" text,
	"variety" text,
	"process" text,
	"roast" text,
	"altitude" text,
	"sca" smallint,
	"notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"flavor_acidity" smallint,
	"flavor_sweetness" smallint,
	"flavor_body" smallint,
	"farm" text,
	"story" text,
	"price_g250" integer,
	"price_g500" integer,
	"price_g1000" integer,
	"price_piece" integer,
	"subcategory_id" integer,
	"stock_threshold" integer DEFAULT 0 NOT NULL,
	"oos_behavior" "oos_behavior" DEFAULT 'SHOW_BADGE' NOT NULL,
	"allow_in_box" boolean DEFAULT false NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"customer_phone" text,
	"customer_name" text NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"order_id" integer,
	"verified" boolean DEFAULT false NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"store_name" text DEFAULT 'خزف' NOT NULL,
	"delivery_customer_price" integer DEFAULT 3000 NOT NULL,
	"cashback_per_amount" integer DEFAULT 1000 NOT NULL,
	"point_value" integer DEFAULT 30 NOT NULL,
	"loyalty_validity_days" integer DEFAULT 90 NOT NULL,
	"box_discount_pct" integer DEFAULT 20 NOT NULL,
	"box_tiers" jsonb DEFAULT '[{"bags":3,"rewardType":"PERCENT","value":10},{"bags":4,"rewardType":"PERCENT","value":20},{"bags":5,"rewardType":"FREE_DELIVERY"},{"bags":6,"rewardType":"GIFT"}]'::jsonb NOT NULL,
	"featured_mode" text DEFAULT 'manual' NOT NULL,
	"top_bar_messages" text[] DEFAULT '{}'::text[] NOT NULL,
	"contact_phone" text,
	"instagram" text DEFAULT 'khazf.roaster',
	"whatsapp" text,
	"maintenance_mode" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings_internal" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"delivery_cost_basra" integer DEFAULT 0 NOT NULL,
	"delivery_cost_other" integer DEFAULT 0 NOT NULL,
	"telegram_bot_token" text,
	"telegram_chat_id" text,
	"notify_new_order" boolean DEFAULT true NOT NULL,
	"notify_low_stock" boolean DEFAULT true NOT NULL,
	"notify_new_review" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "subcategories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "cashback_ledger" ADD CONSTRAINT "cashback_ledger_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashback_ledger" ADD CONSTRAINT "cashback_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_code_coupons_code_fk" FOREIGN KEY ("coupon_code") REFERENCES "public"."coupons"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_places" ADD CONSTRAINT "product_places_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_places" ADD CONSTRAINT "product_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_phone_customers_phone_fk" FOREIGN KEY ("customer_phone") REFERENCES "public"."customers"("phone") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_customer_idx" ON "cashback_ledger" USING btree ("customer_phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_order_uq" ON "coupon_usages" USING btree ("coupon_code","order_id");--> statement-breakpoint
CREATE INDEX "batches_fifo_idx" ON "inventory_batches" USING btree ("product_id","received_at");--> statement-breakpoint
CREATE INDEX "movements_product_idx" ON "inventory_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_phone","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("active");--> statement-breakpoint
CREATE INDEX "products_type_idx" ON "products" USING btree ("type");--> statement-breakpoint
CREATE INDEX "reviews_product_idx" ON "reviews" USING btree ("product_id","status");
-- تسلسل رقم الطلب المضمون التفرّد (KHZ-1001, KHZ-1002…)
CREATE SEQUENCE IF NOT EXISTS khazf_order_seq START 1001;

-- تحديث updated_at تلقائياً على المنتجات
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ضمان صف واحد للإعدادات
ALTER TABLE settings ADD CONSTRAINT settings_singleton CHECK (id = 1);
ALTER TABLE settings_internal ADD CONSTRAINT settings_internal_singleton CHECK (id = 1);

-- ═══════════════════════════════════════════════════════════
-- خزف — سياسات أمان الصفوف (RLS) لـ Supabase
-- تُلصق بمحرر SQL في Supabase بعد تشغيل الهجرات — مرة واحدة
-- المبدأ: الخادم (service_role) يتجاوز RLS · هذه تحمي الوصول المباشر عبر REST/JS
-- ═══════════════════════════════════════════════════════════

-- دالة: هل المستخدم الحالي مدير؟
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid()::text);
$$;

-- دالة: هاتف المستخدم الموثَّق (من Supabase Auth)
CREATE OR REPLACE FUNCTION public.jwt_phone() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(auth.jwt() ->> 'phone', '')
$$;

-- تفعيل RLS على كل الجداول
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_migrations'
  LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ── قراءة عامة (الكتالوج) ──
CREATE POLICY pub_products_read  ON products       FOR SELECT USING (active = true OR is_admin());
CREATE POLICY pub_places_read    ON places         FOR SELECT USING (active = true OR is_admin());
CREATE POLICY pub_subcats_read   ON subcategories  FOR SELECT USING (active = true OR is_admin());
CREATE POLICY pub_pp_read        ON product_places FOR SELECT USING (true);
CREATE POLICY pub_banners_read   ON banners        FOR SELECT USING (active = true OR is_admin());
CREATE POLICY pub_settings_read  ON settings       FOR SELECT USING (true);
CREATE POLICY pub_journey_read   ON journey_levels FOR SELECT USING (true);
CREATE POLICY pub_gifts_read     ON box_gifts      FOR SELECT USING (active = true OR is_admin());
CREATE POLICY pub_reviews_read   ON reviews        FOR SELECT USING (status = 'PUBLISHED' OR is_admin());

-- ── العميل الموثَّق: بياناته هو فقط ──
CREATE POLICY cust_self_read   ON customers FOR SELECT USING (phone = jwt_phone() OR is_admin());
CREATE POLICY cust_self_update ON customers FOR UPDATE USING (phone = jwt_phone()) WITH CHECK (phone = jwt_phone());

CREATE POLICY orders_self_read ON orders FOR SELECT USING (customer_phone = jwt_phone() OR is_admin());
CREATE POLICY items_self_read  ON order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.customer_phone = jwt_phone() OR is_admin())));

CREATE POLICY ledger_self_read ON cashback_ledger FOR SELECT USING (customer_phone = jwt_phone() OR is_admin());
CREATE POLICY fav_self_all     ON favorites FOR ALL
  USING (customer_phone = jwt_phone()) WITH CHECK (customer_phone = jwt_phone());

-- تقييم: من عميل موثَّق باسمه (التوثيق الفعلي بالخادم)
CREATE POLICY reviews_insert ON reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND customer_phone = jwt_phone() AND status = 'PENDING');

-- ── الإداري حصراً (كتابة الكتالوج والإعدادات والداخلي) ──
CREATE POLICY adm_products  ON products          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_places    ON places            FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_subcats   ON subcategories     FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_pp        ON product_places    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_banners   ON banners           FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_settings  ON settings          FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_sint      ON settings_internal FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_journey   ON journey_levels    FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_gifts     ON box_gifts         FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_coupons   ON coupons           FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_cusages   ON coupon_usages     FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_batches   ON inventory_batches   FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_moves     ON inventory_movements FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_orders    ON orders            FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_items     ON order_items       FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_customers ON customers         FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_ledger    ON cashback_ledger   FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_reviews   ON reviews           FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY adm_admins    ON admins            FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ملاحظة: إنشاء الطلبات/العملاء/استخدام الأكواد يتم حصراً عبر الخادم (service_role)
-- داخل Transaction — لذلك لا سياسات INSERT عامة لها. (القسم ١١: لا ثقة بالعميل)

-- ═══════════════════════════════════════════════════════
-- زرع بيانات خزف الحقيقية — يُلصق بمحرر SQL بعد الهجرات
-- آمن للإعادة: يفرّغ جداول الكتالوج فقط (لا يمس طلبات/عملاء)
-- ═══════════════════════════════════════════════════════
TRUNCATE product_places, products, subcategories, places,
  journey_levels, box_gifts, banners, settings, settings_internal RESTART IDENTITY CASCADE;

INSERT INTO places (slug, name, sort, active, show_in_nav) VALUES
 ('home','الصفحة الرئيسية',0,true,false),
 ('coffee','القهوة',1,true,true),
 ('box','بناء البوكس',2,true,true),
 ('espresso_tools','أدوات الإسبريسو',3,false,true),
 ('drip_tools','أدوات التقطير',4,false,true);

INSERT INTO subcategories (name, sort) VALUES
 ('مطاحن',1),('أقماع',2),('فلاتر',3),('سيرفرات',4),('غلايات',5),('موازين',6);

INSERT INTO products
 (slug,type,name,latin_name,country,flag,latin_origin,region,variety,process,roast,altitude,sca,
  notes,flavor_acidity,flavor_sweetness,flavor_body,description,trigger,price_g250,allow_in_box,stock_threshold,badge)
VALUES
 ('kaldi','COFFEE','كالدي','KALDI','إثيوبيا','🇪🇹','ETHIOPIA · GUJI','غوجي هامبيلا','Heirloom','طبيعية','وسط','١٤٠٠م',88,
  ARRAY['توت','حمضيات','أزهار'],4,3,2,
  'من موطن القهوة الأول. محصول يُجفَّف طبيعياً على أسرّة مرفوعة، فيحمل عطر التوت وصفاء الحمضيات في كل فنجان.',
  'إذا تحب القهوة الفاكهية النظيفة… هذا اختيارك',26000,true,2000,NULL),
 ('cerrado','COFFEE','سيرادو','CERRADO','البرازيل','🇧🇷','BRAZIL · CERRADO','سيرادو','Catuai','طبيعية','وسط','١٢٠٠م',85,
  ARRAY['شوكولا','بندق','قوام كامل'],2,4,4,
  'من هضاب سيرادو البرازيلية. تحميص وسط يبرز الشوكولا والبندق بقوام كامل يناسب كل الطرق.',
  'إذا تريد قهوة يومية دافئة ومريحة… هنا الإجابة',24000,true,2000,NULL),
 ('dorado','COFFEE','الدورادو','EL DORADO','كولومبيا','🇨🇴','COLOMBIA · HUILA','هويلا / سوبريمو','Castillo · Caturra','مغسولة','وسط',NULL,NULL,
  ARRAY['كراميل','حلاوة نظيفة'],NULL,NULL,NULL,
  'أسطورة الذهب الكولومبية في فنجان. معالجة مغسولة تمنحه حلاوة كراميل نظيفة وتوازناً يليق بكل صباح.',
  'إذا تبحث عن الكلاسيكي الفاخر… هذا اختيارك',25000,true,2000,NULL),
 ('antigua','COFFEE','أنتيغوا','ANTIGUA','غواتيمالا','🇬🇹','GUATEMALA · ANTIGUA',NULL,NULL,NULL,NULL,NULL,NULL,
  ARRAY['توابل','تعقيد'],NULL,NULL,NULL,
  'من وادٍ بركاني تغذّي تربتَه المعادن، فيخرج بطبقات توابل دافئة تتكشّف رشفة بعد رشفة.',
  'إذا تحب الأكواب المركّبة الغامضة… هذا الخيار',20000,true,2000,'جديد');

INSERT INTO product_places (product_id, place_id)
SELECT p.id, pl.id FROM products p CROSS JOIN places pl WHERE pl.slug IN ('home','coffee','box');

INSERT INTO journey_levels (level, reward_type, value, gift_name) VALUES
 (1,'PERCENT',5,NULL),(2,'FREE_DELIVERY',0,NULL),(3,'GIFT',750,'توت باج'),
 (4,'GIFT',1500,'فلاتر V60'),(5,'GIFT',2000,'كوب فخّاري'),(6,'GIFT',0,'كيس قهوة مجاني');

INSERT INTO box_gifts (name, sort) VALUES ('كوب فخّاري',1),('فلاتر V60',2);
INSERT INTO banners (text, sort, active) VALUES ('محاصيلنا',0,true);

INSERT INTO settings (id, top_bar_messages) VALUES
 (1, ARRAY['توصيل لكل محافظات العراق — ٣٬٠٠٠ د.ع','نحمّص باستمرار · الدفع عند الاستلام']);
INSERT INTO settings_internal (id) VALUES (1);
