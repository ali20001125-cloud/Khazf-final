/**
 * بنية تفاصيل الأداة (toolSpecs) — مرنة، تُخزّن كـJSON بعمود products.toolSpecs.
 * كل الحقول اختيارية: كل أداة تملأ ما يناسبها فقط.
 * القهوة لا تستخدم هذا الحقل إطلاقاً (يبقى null).
 */

/** لون مع صوره الخاصة — عند اختيار اللون تظهر صورته */
export type ToolColor = {
  name: string;        // اسم اللون (شفاف، رمادي دخاني، أزرق...)
  hex: string;         // كود اللون للأيقونة الدائرية
  image?: string;      // مسار صورة المنتج بهذا اللون (Supabase Storage) — اختياري
};

/** مقاس (للفلاتر والأقماع) */
export type ToolSize = {
  label: string;       // ٠١ · ٠٢ · V01...
  sub?: string;        // وصف صغير: "١–٢ أكواب"
};

/** ميزة سردية — "لماذا هذه الأداة" */
export type ToolFeature = {
  icon?: string;       // إيموجي/رمز بسيط (اختياري)
  title: string;
  desc: string;
};

/** مواصفة منظّمة */
export type ToolSpec = {
  key: string;         // المادة · السعة · الارتفاع...
  value: string;
};

/** جزء مشروح (نمط 2: صورة قريبة + شرح جنبها) */
export type ToolPart = {
  image?: string;      // صورة قريبة للجزء (اختياري)
  tag?: string;        // وسم صغير: "الفوهة الحلزونية"
  title: string;       // عنوان: "تدفّق موجّه"
  desc: string;        // الشرح
};

/** نقطة تفاعلية على الصورة (نمط 3) */
export type ToolHotspot = {
  x: number;           // نسبة أفقية 0-100
  y: number;           // نسبة رأسية 0-100
  title: string;
  desc: string;
};

/** بنية toolSpecs الكاملة */
export type ToolSpecs = {
  hero?: string;                 // جملة البطل الفارقة
  features?: ToolFeature[];      // لماذا هذه الأداة
  specs?: ToolSpec[];            // المواصفات المنظّمة
  parts?: ToolPart[];            // الأجزاء المشروحة (نمط 2)
  hotspots?: ToolHotspot[];      // النقاط التفاعلية (نمط 3) — تُعرض على أول صورة
  sizes?: ToolSize[];            // المقاسات
  colors?: ToolColor[];          // الألوان (مع صورها)
  compat?: string[];             // "يعمل مع..."
  boxContents?: string[];        // محتويات العبوة
};

/** قيمة افتراضية فارغة */
export const emptyToolSpecs: ToolSpecs = {
  hero: "",
  features: [],
  specs: [],
  parts: [],
  hotspots: [],
  sizes: [],
  colors: [],
  compat: [],
  boxContents: [],
};
