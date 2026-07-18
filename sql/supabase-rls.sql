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
