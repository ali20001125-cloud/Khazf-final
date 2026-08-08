# بيئة الاختبار — خزف

## الفروع

| الفرع | الغرض | الرابط |
|---|---|---|
| `main` | متجر الزبائن | khazf.shop |
| `staging` | الاختبار | test.khazf.shop |
| `pre-redesign` | نسخة احتياطية | — |

## إعداد هوستنجر (مرة واحدة)

1. أنشئ دومين فرعي `test.khazf.shop`
2. اربطه بمستودع `ali20001125-cloud/Khazf-final` — **فرع `staging`**
3. أضف نفس متغيّرات البيئة، مع إضافة:
   ```
   NEXT_PUBLIC_ENV=staging
   STAGING_PASSWORD=اختر_كلمة_مرور_قوية
   ```
4. فعّل Redeploy التلقائي على `staging`

## الحماية التلقائية ببيئة الاختبار

- لافتة حمراء أعلى الصفحة
- **Meta Pixel معطّل** — لا أحداث تصل ميتا
- **تسجيل الزيارات معطّل** — لا تلوّث التحليلات
- Google Analytics معطّل
- **كلمة مرور إلزامية** — لا يدخل أحد بلا `STAGING_PASSWORD`
- **منع فهرسة كامل** — robots.txt يمنع كل الزواحف
- **الطلبات مرفوضة** إلا من بريد/رقم مسجّل في `test_identities`

⚠️ **قاعدة البيانات مشتركة** — أي طلب تجريبي يُسجَّل فعلاً.
استخدم إيميلاتك المسجّلة في `test_identities` فتُستثنى من الإحصاءات.

## دورة العمل الأسبوعية

```
خلال الأسبوع  →  التطوير على staging  →  اختبار على test.khazf.shop
يوم النقل     →  دمج staging في main  →  نشر تلقائي على khazf.shop
```

### أوامر النقل
```bash
git checkout main
git merge staging
git push origin main
```

### إرجاع staging لحالة main (بعد النقل)
```bash
git checkout staging
git reset --hard main
git push -f origin staging
```
