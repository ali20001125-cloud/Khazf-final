-- رقمان: seqNo داخلي متسلسل (1،2،3...) + orderNumber فاتورة قافزة للزبون
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seq_no integer;
CREATE SEQUENCE IF NOT EXISTS khazf_internal_seq START 1;
-- ملء المتسلسل الداخلي للطلبات الموجودة حسب تاريخها
DO $$
DECLARE r RECORD; i integer := 0;
BEGIN
  FOR r IN SELECT id FROM orders ORDER BY created_at LOOP
    i := i + 1;
    UPDATE orders SET seq_no = i WHERE id = r.id;
  END LOOP;
  PERFORM setval('khazf_internal_seq', GREATEST(i, 1));
END $$;
