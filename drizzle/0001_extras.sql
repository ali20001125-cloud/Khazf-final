-- تسلسل رقم الطلب المضمون التفرّد (KHZ-1001, KHZ-1002…)
CREATE SEQUENCE IF NOT EXISTS khazf_order_seq START 1100;

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
