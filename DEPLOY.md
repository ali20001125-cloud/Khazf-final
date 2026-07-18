# دليل نشر خزف — من الصفر للهواء 🚀

## ١) Supabase (قاعدة البيانات + الدخول)
1. أنشئ مشروعاً على supabase.com (المنطقة: أقرب لك — Frankfurt جيدة)
2. **SQL Editor** → الصق وشغّل بالترتيب:
   - `drizzle/0000_*.sql` ثم `drizzle/0001_extras.sql` ثم `sql/supabase-rls.sql`
3. **Project Settings → Database**: انسخ رابط **Connection Pooler (Transaction)** — هذا `DATABASE_URL`
4. **Project Settings → API**: انسخ `Project URL` و`anon key` و`service_role key`
5. **الزرع من جهازك** (مرة واحدة): بدّل `DATABASE_URL` في `.env` برابط Supabase ثم:
   `npm run seed` (البيانات الحقيقية فقط — بلا مخزون؛ أضف وجباتك من اللوحة)

## ٢) دخول Google
1. Supabase → **Authentication → Providers → Google** → فعّله
2. أنشئ OAuth Client من Google Cloud Console والصق Client ID/Secret
3. **Redirect URLs** أضف: `https://khazf.coffee/auth/callback/` (وللتجربة: `http://localhost:3000/auth/callback/`)
4. أول دخول Google واللوحة فارغة = تُسجَّل **مالكاً مؤسِّساً** تلقائياً — أضف بقية المدراء من الإعدادات

## ٣) Hostinger (الاستضافة)
1. ارفع المشروع إلى GitHub (أو أعطني Token وأرفعه أنا) ثم بـ hPanel: **Website → Import from GitHub**
2. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   AUTH_SECRET=<سلسلة عشوائية طويلة — openssl rand -base64 32>
   ADMIN_PASSWORD=<اختياري كباب طوارئ محلي فقط>
   ```
3. Build: `npm run build` · Start: `npm start` · Node ≥ 20

## ٤) تيليجرام (إشعار الطلبات)
1. @BotFather → `/newbot` → خذ الـToken
2. أرسل رسالة للبوت ثم افتح `api.telegram.org/bot<TOKEN>/getUpdates` وخذ `chat.id`
3. الصقهما في **اللوحة → الإعدادات → داخلي** — يشتغل فوراً

## ٥) بعد الإطلاق مباشرة
- اللوحة → المخزون: **+ وجبة** لكل محصول بتكاليفها الحقيقية
- اللوحة → المنتجات: أسعار ٥٠٠غ/كيلو إن أردت عرضها · ارتفاع/SCA الدورادو · قصص المزارع
- جرّب طلباً حقيقياً بهاتفك: تأكيد ← «تم التوصيل» ← بعد ٤٨سا تلقى نقاطك

## الأمان (ملخص ما هو مبني)
هوية الزبون: كوكي HMAC يُمنح فقط لرقم جديد أو مربوط بـ Google الحاضر · ربط رقم قديم = هاتف + رقم طلب سابق ·
كل الحسابات بالخادم داخل Transactions · اللوحة خلف بوابة + كل Action خلف requireAdmin · RLS كامل على Supabase ·
robots بلا أي إشارة للوحة · ترويسات nosniff/DENY/Referrer
