-- ═══ منتجات عرض تجريبية (أدوات) + تفعيل قسمَي الأدوات — للمعاينة فقط ═══
UPDATE places SET active = true WHERE slug IN ('espresso_tools','drip_tools');

INSERT INTO products (slug,type,name,latin_name,description,price_piece,subcategory_id,badge,active) VALUES
 ('v60-dripper','TOOL','قمع V60','V60 DRIPPER','قمع تقطير كلاسيكي للاستخلاص النظيف — بلاستيك حراري.',15000,(SELECT id FROM subcategories WHERE name='أقماع'),'تجريبي',true),
 ('paper-filters','TOOL','فلاتر ورقية ١٠٠','PAPER FILTERS','فلاتر V60 بيضاء مقاس 02.',8000,(SELECT id FROM subcategories WHERE name='فلاتر'),'تجريبي',true),
 ('glass-server','TOOL','سيرفر زجاجي','GLASS SERVER','سيرفر ٦٠٠ مل مقاوم للحرارة.',22000,(SELECT id FROM subcategories WHERE name='سيرفرات'),'تجريبي',true),
 ('hand-grinder','TOOL','مطحنة يدوية','HAND GRINDER','شفرات سيراميك بدرجات طحن مضبوطة.',45000,(SELECT id FROM subcategories WHERE name='مطاحن'),'تجريبي',true),
 ('tamper-58','TOOL','تامبر ٥٨مم','TAMPER 58','تامبر ستانلس بقاعدة مستوية للإسبريسو.',28000,NULL,'تجريبي',true),
 ('digital-scale','TOOL','ميزان رقمي','DIGITAL SCALE','دقة ٠.١غ مع مؤقّت مدمج.',35000,(SELECT id FROM subcategories WHERE name='موازين'),'تجريبي',true)
ON CONFLICT (slug) DO NOTHING;

-- أماكن الظهور: أدوات التقطير الثلاث الأولى + مطحنة/ميزان بالاثنين + تامبر للإسبريسو
INSERT INTO product_places (product_id, place_id)
SELECT p.id, pl.id FROM products p, places pl
WHERE (p.slug IN ('v60-dripper','paper-filters','glass-server','hand-grinder','digital-scale') AND pl.slug='drip_tools')
   OR (p.slug IN ('tamper-58','hand-grinder','digital-scale') AND pl.slug='espresso_tools')
ON CONFLICT DO NOTHING;

-- مخزون تجريبي بسيط للأدوات (١٠ قطع لكل وحدة)
INSERT INTO inventory_batches (product_id, qty_received, qty_remaining, cost_per_piece, note)
SELECT id, 10, 10, 0, 'تجريبي' FROM products WHERE badge='تجريبي';
