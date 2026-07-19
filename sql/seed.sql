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
 (1,'GIFT',750,'توت باج'),
 (2,'PERCENT',10,NULL),
 (3,'FREE_DELIVERY',0,NULL),
 (4,'GIFT',1500,'فلاتر V60'),
 (5,'GIFT',2000,'كوب فخّاري'),
 (6,'GIFT',0,'كيس قهوة مجاني');

INSERT INTO box_gifts (name, sort) VALUES ('كوب فخّاري',1),('فلاتر V60',2);
INSERT INTO banners (text, sort, active) VALUES ('محاصيلنا',0,true);

INSERT INTO settings (id, top_bar_messages) VALUES
 (1, ARRAY['توصيل لكل محافظات العراق — ٣٬٠٠٠ د.ع','نحمّص باستمرار · الدفع عند الاستلام']);
INSERT INTO settings_internal (id) VALUES (1);
