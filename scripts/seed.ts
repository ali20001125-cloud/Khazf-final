/**
 * الزرع — أمر يدوي فقط: npm run seed
 * ─────────────────────────────────────
 * (درس النسخة السابقة: ممنوع الزرع التلقائي وقت التشغيل)
 * البيانات هنا حقيقية حصراً حسب DATA-CORRECTIONS.md:
 * • لا قصص مزارع مخترعة (المالك يكتبها)
 * • لا تقييمات وهمية (المتجر جديد = صفر)
 * • لا مخزون وهمي (يبدأ صفراً — المالك يضيف وجبة)
 * • أسعار ٥٠٠غ/كيلو = null (يدخلها المالك يدوياً)
 * آمن للإعادة: يفرّغ جداول الكتالوج ويعيد زرعها (لا يمس الطلبات/العملاء)
 */
import "dotenv/config";
import { db, schema as s } from "../lib/server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("⏳ زرع بيانات خزف الحقيقية…");

  await db.transaction(async (tx) => {
    /* تفريغ جداول الكتالوج والإعداد فقط */
    await tx.execute(sql`TRUNCATE product_places, products, subcategories, places,
      journey_levels, box_gifts, banners, settings, settings_internal RESTART IDENTITY CASCADE`);

    /* ── أماكن الظهور ── */
    const placeRows = await tx
      .insert(s.places)
      .values([
        { slug: "home", name: "الصفحة الرئيسية", sort: 0, showInNav: false },
        { slug: "coffee", name: "القهوة", sort: 1 },
        { slug: "box", name: "بناء البوكس", sort: 2 },
        // بنية الأدوات جاهزة لكن مُوقَفة حتى وصول المنتجات (استراتيجية الإطلاق)
        { slug: "espresso_tools", name: "أدوات الإسبريسو", sort: 3, active: false },
        { slug: "drip_tools", name: "أدوات التقطير", sort: 4, active: false },
      ])
      .returning({ id: s.places.id, slug: s.places.slug });
    const P = Object.fromEntries(placeRows.map((r) => [r.slug, r.id]));

    /* ── أصناف الأدوات (جاهزة للتفعيل لاحقاً) ── */
    await tx.insert(s.subcategories).values([
      { name: "مطاحن", sort: 1 },
      { name: "أقماع", sort: 2 },
      { name: "فلاتر", sort: 3 },
      { name: "سيرفرات", sort: 4 },
      { name: "غلايات", sort: 5 },
      { name: "موازين", sort: 6 },
    ]);

    /* ── المحاصيل الأربعة — البيانات المصحَّحة ── */
    const coffees = await tx
      .insert(s.products)
      .values([
        {
          slug: "kaldi", type: "COFFEE", name: "كالدي", latinName: "KALDI",
          country: "إثيوبيا", flag: "🇪🇹", latinOrigin: "ETHIOPIA · GUJI",
          region: "غوجي هامبيلا", variety: "Heirloom", process: "طبيعية",
          roast: "وسط", altitude: "١٤٠٠م", sca: 88,
          notes: ["توت", "حمضيات", "أزهار"],
          flavorAcidity: 4, flavorSweetness: 3, flavorBody: 2,
          description: "من موطن القهوة الأول. محصول يُجفَّف طبيعياً على أسرّة مرفوعة، فيحمل عطر التوت وصفاء الحمضيات في كل فنجان.",
          trigger: "إذا تحب القهوة الفاكهية النظيفة… هذا اختيارك",
          priceG250: 26000, allowInBox: true, stockThreshold: 2000,
        },
        {
          slug: "cerrado", type: "COFFEE", name: "سيرادو", latinName: "CERRADO",
          country: "البرازيل", flag: "🇧🇷", latinOrigin: "BRAZIL · CERRADO",
          region: "سيرادو", variety: "Catuai", process: "طبيعية",
          roast: "وسط", altitude: "١٢٠٠م", sca: 85,
          notes: ["شوكولا", "بندق", "قوام كامل"],
          flavorAcidity: 2, flavorSweetness: 4, flavorBody: 4,
          description: "من هضاب سيرادو البرازيلية. تحميص وسط يبرز الشوكولا والبندق بقوام كامل يناسب كل الطرق.",
          trigger: "إذا تريد قهوة يومية دافئة ومريحة… هنا الإجابة",
          priceG250: 24000, allowInBox: true, stockThreshold: 2000,
        },
        {
          slug: "dorado", type: "COFFEE", name: "الدورادو", latinName: "EL DORADO",
          country: "كولومبيا", flag: "🇨🇴", latinOrigin: "COLOMBIA · HUILA",
          region: "هويلا / سوبريمو", variety: "Castillo · Caturra", process: "مغسولة",
          roast: "وسط", altitude: null, sca: null, // يحددهما المالك
          notes: ["كراميل", "حلاوة نظيفة"],
          description: "أسطورة الذهب الكولومبية في فنجان. معالجة مغسولة تمنحه حلاوة كراميل نظيفة وتوازناً يليق بكل صباح.",
          trigger: "إذا تبحث عن الكلاسيكي الفاخر… هذا اختيارك",
          priceG250: 25000, allowInBox: true, stockThreshold: 2000,
        },
        {
          slug: "antigua", type: "COFFEE", name: "أنتيغوا", latinName: "ANTIGUA",
          country: "غواتيمالا", flag: "🇬🇹", latinOrigin: "GUATEMALA · ANTIGUA",
          notes: ["توابل", "تعقيد"], // باقي التفاصيل يحددها المالك
          description: "من وادٍ بركاني تغذّي تربتَه المعادن، فيخرج بطبقات توابل دافئة تتكشّف رشفة بعد رشفة.",
          trigger: "إذا تحب الأكواب المركّبة الغامضة… هذا الخيار",
          priceG250: 20000, allowInBox: true, stockThreshold: 2000, badge: "جديد",
        },
      ])
      .returning({ id: s.products.id, slug: s.products.slug });

    /* كل المحاصيل تظهر في: الرئيسية + القهوة + البوكس */
    await tx.insert(s.productPlaces).values(
      coffees.flatMap((c) =>
        [P.home, P.coffee, P.box].map((placeId) => ({ productId: c.id, placeId }))
      )
    );

    /* ── رحلة المكافآت (٦ مستويات — أمثلة القسم ٥.٢، يعدّلها المالك) ── */
    await tx.insert(s.journeyLevels).values([
      { level: 1, rewardType: "PERCENT", value: 5 },
      { level: 2, rewardType: "FREE_DELIVERY", value: 0 },
      { level: 3, rewardType: "GIFT", value: 750, giftName: "توت باج" },
      { level: 4, rewardType: "GIFT", value: 1500, giftName: "فلاتر V60" },
      { level: 5, rewardType: "GIFT", value: 2000, giftName: "كوب فخّاري" },
      { level: 6, rewardType: "GIFT", value: 0, giftName: "كيس قهوة مجاني" },
    ]);

    /* ── هدايا البوكس (مستوى ٦) ── */
    await tx.insert(s.boxGifts).values([
      { name: "كوب فخّاري", sort: 1 },
      { name: "فلاتر V60", sort: 2 },
    ]);

    /* ── البنر ── */
    await tx.insert(s.banners).values([{ text: "محاصيلنا", sort: 0, active: true }]);

    /* ── الإعدادات ── */
    await tx.insert(s.settings).values([
      {
        id: 1,
        topBarMessages: [
          "توصيل لكل محافظات العراق — ٣٬٠٠٠ د.ع",
          "نحمّص باستمرار · الدفع عند الاستلام",
        ],
      },
    ]);
    await tx.insert(s.settingsInternal).values([{ id: 1 }]);
  });

  console.log("✓ اكتمل الزرع: ٤ محاصيل · ٥ أماكن · ٦ أصناف · رحلة ٦ مستويات · إعدادات");
  console.log("ℹ المخزون = صفر (حقيقي) — أضف وجبة من اللوحة، أو للتجربة: npm run seed:demo-stock");
  process.exit(0);
}

main().catch((e) => { console.error("✗", e); process.exit(1); });
