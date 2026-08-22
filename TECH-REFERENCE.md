# خزف — المرجع التقني الكامل

> كل ما بُني وكيف يعمل. اقرأه مع `START-HERE.md`.

---

## ١) البنية والتقنيات

| الطبقة | التقنية |
|---|---|
| الإطار | **Next.js 15.5.23** — App Router · TypeScript |
| التنسيق | **Tailwind v4** · متغيّرات CSS في `app/globals.css` |
| قاعدة البيانات | **Supabase (PostgreSQL 17)** — الهند `ap-south-1` |
| الوصول للقاعدة | **Drizzle ORM** عبر `DATABASE_URL` (اتصال مباشر) |
| المصادقة | **Supabase Auth** — جوجل + رمز بريد |
| التخزين | **Supabase Storage** — الصور في المشروع القديم |
| الاستضافة | **هوستنجر** — Node 22 · نشر تلقائي من جيت‑هَب |
| الحركة | **GSAP + ScrollTrigger** · **Lenis** (حاسوب فقط) |
| الأيقونات | **lucide-react** |
| البريد | **Nodemailer** عبر SMTP هوستنجر |
| الإشعارات | **Telegram Bot API** |

**الخطوط:** خط النظام العربي فقط — حُذفت Google Fonts لأنها تسبّب قفز التخطيط وحجب الرسم.

---

## ٢) الرفع والنشر

```bash
# البناء والاختبار
npx tsc --noEmit          # فحص الأنواع
npx next build            # البناء الكامل

# الدفع
git add -A && git commit -m "الوصف"
git push origin main      # → ينشر تلقائياً على khazf.shop
git push origin staging   # → ينشر على staging.khazf.shop
```

**هوستنجر يراقب الفرعين وينشر تلقائياً** خلال دقيقتين. ولا حاجة لأي أمر آخر.

**والمتغيّرات** تُضبط في لوحة هوستنجر ولا تُطبَّق إلا بإعادة نشر.

### متغيّرات البيئة
```
DATABASE_URL · KHAZF_DATABASE_URL     ← رابط Session pooler
NEXT_PUBLIC_SUPABASE_URL              ← https://pnctailrzcijrpsyczwu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY         ← المفتاح الطويل (لا sb_publishable)
SUPABASE_SERVICE_ROLE_KEY
AUTH_SECRET · ADMIN_PASSWORD · CRON_SECRET · SITE_URL
SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · MAIL_FROM · ADMIN_EMAIL
NEXT_PUBLIC_GA_ID · NEXT_PUBLIC_FB_PIXEL_ID · NEXT_PUBLIC_CLARITY_ID
NEXT_PUBLIC_ENV=staging               ← في staging فقط
```

---

## ٣) صفحات المتجر

| المسار | الوصف |
|---|---|
| `/` | الرئيسية — أسلوب «البلاط»: بطل · شريط ثقة · محاصيل بتمرير · بوكس · أقسام · تقييمات · لماذا خزف · مساعد الاختيار |
| `/products` | المتجر — بحث وفلاتر وأقسام وفرز |
| `/product?c=slug` | صفحة المحصول — معرض بشرائح معلوماتية · لوحة شراء · مطويّات · شريط ثابت |
| `/product?t=slug` | صفحة الأداة — خيارات بألوانها · مواصفات · نقاط تفاعلية · أجزاء مشروحة |
| `/box` | بناء البوكس — مستويات · هدايا · ملخّص شفاف |
| `/cart` `/checkout` | السلة والدفع |
| `/account` | الحساب — طلبات · نقاط · مفضلة |
| `/invoice?n=&p=` | الفاتورة وتتبّع الطلب — بلا تسجيل |
| `/review?token=` | التقييم بعد التوصيل |
| `/lp/[slug]` | صفحات هبوط للإعلانات |
| `/no-track` | استثناء جهازك من التحليلات |

---

## ٤) لوحة الإدارة `/alikhazf25`

**مجموعات:** يومي (القيادة · الطلبات · التحليلات) · المنتجات (القهوة · الأدوات · المخزون) · العملاء والتسويق (العملاء · التقييمات · آراء البراند · الأكواد · الولاء · البنرات) · الإعداد

**التحليلات تعرض:** مسار الشراء يومياً وشهرياً · إحصاءات المحافظات · **الربح الحقيقي** بعد التغليف والتوصيل · ملخّص السلات · قائمة البريد بشارة «طلب ✓»

**القهوة:** ترتيب بالسحب (يُطبَّق على الرئيسية والمتجر) · وسم لكل محصول · طرق التحضير · طريقة عرض التحميص (نسبي/تاريخ/إخفاء)

---

## ٥) التسجيل والحسابات

### الطرق
**جوجل** — `signInWithOAuth` → Supabase → `/auth/callback`
**رمز بريد** — `signInWithOtp` → رمز ٦ أرقام → `verifyOtp`

### ما يحدث بعد التسجيل
ينشأ سجلّ عميل فوراً ببريده (بلا هاتف) · ويُرسل الترحيب مرة واحدة (`welcomed_at` يمنع التكرار)

### ربط الحساب بسجلّ الزبون — ثلاث طرق
1. **بالحساب** — `auth_user_id` مطابق
2. **بالبريد** — إن تطابق بريد الحساب مع بريد الزبون
3. **بالهاتف** — من الكوكي، أو عند الطلب بأي رقم

**فمن طلب سابقاً بلا بريد يجد نقاطه حين يسجّل ويطلب بنفس رقمه.**

### السجلّ المؤقّت
من يسجّل بلا هاتف يأخذ `phone = auth:xxxxx` — **مخفيّ في الواجهة**، ويندمج مع رقمه الحقيقي عند أول طلب.

### نقاط حرجة
- `middleware.ts` يلتقط `?code=` من الجذر ويحوّله لـ`/auth/callback` — **بلاه لا تُحفظ الجلسة**
- كل مسارات `/api` يجب أن تكون `force-dynamic` — وإلا تُخزَّن الجلسة ويظهر الجميع غير مسجّلين
- كوكيز الجلسة تُكتب على **كائن الاستجابة** لا مخزن الطلب

---

## ٦) البريد

**الإرسال:** Nodemailer عبر `smtp.hostinger.com:465` من `info@khazf.shop`
**السجلّ:** كل رسالة تُقيَّد في `email_log` (النوع · المستلم · النجاح)

### الأنواع
| النوع | متى |
|---|---|
| `welcome` | فور التسجيل |
| `order_confirm` | عند الطلب — مع دعوة فتح الحساب |
| `admin_order` | لعلي و`info@` معاً — بتفاصيل كاملة وزر واتساب |
| `review` | بعد التوصيل — مع دعوة فتح الحساب |
| `brew_tips` | بعد التوصيل بيومين — وصفات المحصول |
| `restock` | عند عودة منتج نفد |
| `cart_1` `cart_2` `cart_3` | تذكير السلة |
| `guide` `announce` | دليل التحضير وإعلانات |

**معاينة أي قالب:** `khazf.shop/api/test-emails?key=KHAZFBOT25&to=EMAIL&only=welcome`

**قوالب Supabase** (رمز الدخول) تُحرَّر في: Authentication ← Emails ← Magic Link · تستخدم `{{ .Token }}`

---

## ٧) الرسائل والإشعارات

**تيليجرام** — بوت يرسل لعلي عند: طلب جديد (بزر واتساب برسالة تأكيد جاهزة) · مخزون منخفض · تقييم جديد · سلات مهجورة · التقرير اليومي

**واتساب** — زر في صفحة الطلب باللوحة يفتح المحادثة برسالة كاملة: البنود والإجمالي والعنوان وموعد الوصول ورابط التتبّع

**فقاعة الموقع** — تظهر بعد ٣٠ ثانية مرة واحدة، وتختفي بعد ١٢ ثانية

---

## ٨) مهام الكرون (cron-job.org)

| المسار | التوقيت | الوظيفة |
|---|---|---|
| `/api/cron/cart-reminders` | كل ساعة | تذكير السلات (رسالتان: ساعة ثم يومان) |
| `/api/cron/daily` | يومياً | التقرير اليومي بتحليل ذكي |
| `/api/cron/brew-tips` | يومياً | وصفات التحضير (٢–٣٠ يوماً بعد التوصيل) |
| `/api/cron/restock` | يومياً | إشعار عودة المخزون |
| `/api/cron/auto-deliver` | يومياً | تعليم الطلبات موصَّلة بعد ٣ أيام |

**كلها تحتاج `?key=KHAZFBOT25`**

---

## ٩) التحليلات والتتبّع

**داخلي** — `page_views` يسجّل الجلسة والمسار والجهاز · **يستبعد الزواحف وهويات الاختبار**
**Meta Pixel** — ViewContent · AddToCart · InitiateCheckout · Purchase
**GA4** — `view_item` · `add_to_cart` · `view_cart` · `begin_checkout` · `purchase` بمعرّف فريد وحماية من التكرار · بالدينار العراقي · ومسار اللوحة مستبعد
**Microsoft Clarity** — خرائط حرارية وتسجيل جلسات (يحتاج `NEXT_PUBLIC_CLARITY_ID`)

**الاستثناء:** كوكي `khz_no_track=1` من `/no-track` · وجدول `test_identities` (إيميلات وأرقام علي)

**طلبات الاختبار** تُعلَّم `is_test` وترقّم `TEST-01` ولا تدخل أي إحصاء.

---

## ١٠) الأداء — ما طُبّق

الصفحات **مبنيّة مسبقاً** (`revalidate = 60`) بدل `force-dynamic` · تخزين الكاتالوج والإعدادات ١٥ دقيقة في الذاكرة (يُبطَل عند أي تعديل باللوحة) · الملفات الثابتة تُخزَّن سنة والصور شهراً · الصور بأبعاد صريحة وتحميل كسول (أول صورة `eager` بأولوية عالية) · Lenis معطّل على الهاتف · استهداف المتصفّحات الحديثة فقط · حذف Google Fonts

**النتيجة:** أول ظهور من ٣٫٤ إلى ١٫١ ثانية.

---

## ١١) الأمان

**RLS مفعّل على ٣١ جدولاً** — قراءة عامة للمنتجات والأقسام والتقييمات المنشورة فقط · بيانات العملاء والطلبات والإيميلات مغلقة تماماً

**صفر ثغرات** في الحزم (Next.js 15.5.23 · فرض `postcss` و`sharp` عبر overrides)

**اللوحة** محميّة بمسار سرّي وكلمة مرور وجلسة

---

## ١٢) ملفات مهمة

```
app/layout.tsx              الطبقة — الإعدادات والكاتالوج والتتبّع
app/globals.css             المتغيّرات والأنماط العامة
middleware.ts               التقاط رمز الدخول من الجذر
lib/server/catalog.ts       جلب المنتجات + التخزين المؤقّت
lib/server/orders.ts        إنشاء الطلب — الخصومات والمخزون والنقاط
lib/server/order-preview.ts معاينة الطلب قبل التثبيت
lib/server/email.ts         كل قوالب البريد
lib/server/telegram.ts      إشعارات البوت
lib/server/customer-identity.ts  التعرّف على الزبون وربط الحساب
lib/store.tsx               حالة السلة والإعدادات
lib/motion.tsx              حركات الظهور (GSAP)
components/scenes/home9.tsx أقسام الرئيسية
components/Cards.tsx        بطاقات المنتجات
```

---

## ١٣) قاعدة البيانات — الجداول

**المنتجات:** `products` · `product_variants` (خيارات بألوانها وصورها) · `product_places` · `subcategories` · `places`

**الطلبات:** `orders` · `order_items` · `coupon_usages`

**العملاء:** `customers` · `cashback_ledger` (قيود النقاط) · `favorites`

**المخزون:** `inventory_batches` (وجبات بتكلفتها) · `inventory_movements` · `shipments`

**التسويق:** `coupons` · `journey_levels` · `box_gifts` · `banners` · `email_leads` · `lead_broadcasts` · `brand_reviews`

**التقييمات:** `reviews` (للمنتجات) · `experience_reviews` (للتجربة)

**النظام:** `settings` (عام) · `settings_internal` (سرّي: تيليجرام والتكاليف) · `admins` · `test_identities` · `email_log` · `page_views` · `abandoned_carts` · `daily_digests`

### حقول مهمة أُضيفت
`products.sort_order` · `products.tag` · `products.brew_methods` · `products.roast_display`
`orders.is_test` · `customers.welcomed_at`
`settings.box_discount_cap` · `cashback_pct` · `home_crops_count` · `home_bestseller_slug`
`settings_internal.packaging_cost_per_bag` · `packaging_cost_per_order` · `delivery_cost_real`

---

## ١٤) منطق الطلب — كيف يُحسب

```
مجموع المنتجات
   − خصم الكمية (على أكياس ٢٥٠غ فقط · مسقوف بـ٢٠٬٠٠٠)
   − خصم رحلة الولاء (إن استحقّ)
   − كود الخصم (إن وُجد)
   − النقاط المستخدمة (بمضاعفات ٢٥٠)
   + التوصيل (٤٬٠٠٠ · مجاني فوق ٩٠٬٠٠٠)
   = الإجمالي (يُقرَّب لأعلى ٢٥٠)
```

**النقاط تُمنح** عند تعليم الطلب موصَّلاً لا عند الطلب — ٣٪ من قيمة المنتجات.

**المخزون يُخصم** من الوجبات (الأقدم أولاً) أو من خيارات المنتج، ويُسجَّل في `inventory_movements`.

**منع التكرار:** أي طلب بنفس الهاتف خلال ٣ دقائق يُرفض ويُعاد رقم الطلب الأصلي.

---

## ١٥) أوامر مفيدة

```bash
# فحص سريع
npx tsc --noEmit | grep -c "error TS"

# بناء مع رؤية الأخطاء
rm -rf .next && npx next build 2>&1 | grep -E "✓ Compiled|Failed|Error"

# معاينة قالب بريد
# khazf.shop/api/test-emails?key=KHAZFBOT25&to=EMAIL&only=welcome

# تشغيل مهمة كرون يدوياً
# khazf.shop/api/cron/cart-reminders?key=KHAZFBOT25

# مزامنة الفرعين
git checkout -B staging origin/staging && git merge main --no-edit && git push origin staging && git checkout main
```

---

## ١٦) أخطاء متكرّرة — تجنّبها

**لا تضف `img { height: auto }` عاماً** — يفسد أبعاد اللوغو

**لا تحذف الإزاحة من حركة الظهور** — تُفسد الحركة فتبقى العناصر مخفية للأبد

**لا تجعل مسارات `/api` مخزّنة** — تُخزَّن الجلسة فيظهر الجميع غير مسجّلين

**لا تستخدم هوامش سالبة (`-mx-4`) داخل حاوية بحشوة** — تتجاوز عرض الشاشة

**لا تعتمد `next/font`** — بيئة العمل لا تصل جوجل فيفشل البناء محلياً

**لا تنسَ `?key=KHAZFBOT25`** مع مسارات الكرون

**تحقّق من `staging` قبل `main`** — المتجر حيّ وله زبائن
