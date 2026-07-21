/**
 * تطبيع رقم الهاتف العراقي.
 * الصحيح: 11 خانة تبدأ بـ07 (مثل 07732269388)، أو 10 خانات بلا الصفر (7732269388).
 * يقبل أيضاً الصيغة الدولية +964 والأرقام العربية.
 */
function toEnglishDigits(s: string): string {
  return (s || "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
                  .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());
}

export function normalizeIqPhone(raw: string): string | null {
  let d = toEnglishDigits(raw).replace(/\D/g, "");
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  // بعد إزالة رمز الدولة: نتوقع 10 خانات تبدأ بـ7 (بلا صفر)، أو 11 تبدأ بـ07
  if (d.length === 11 && d.startsWith("07")) return d;           // 07XXXXXXXXX ✓
  if (d.length === 10 && d.startsWith("7")) return "0" + d;      // 7XXXXXXXXX → 07…
  return null;
}

export function isValidIqPhone(raw: string): boolean {
  return normalizeIqPhone(raw) !== null;
}

/** صيغة واتساب الدولية: 9647XXXXXXXXX */
export function toWaNumber(raw: string): string {
  const n = normalizeIqPhone(raw);
  return n ? "964" + n.slice(1) : toEnglishDigits(raw).replace(/\D/g, "");
}
