/** فحص الإيميل: أخطاء الكتابة الشائعة واقتراح النطاق الصحيح (gmali → gmail) */

const COMMON_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
  "icloud.com", "live.com", "protonmail.com", "yahoo.co.uk",
  "khazf.shop", "me.com", "aol.com", "mail.com",
];

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, d[j], d[j - 1]) + 1;
      prev = tmp;
    }
  }
  return d[n];
}

/** يقترح أقرب نطاق شائع لو المكتوب قريب جداً منه (خطأ إملائي) */
export function suggestDomain(domain: string): string | null {
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null, bestDist = 99;
  for (const cd of COMMON_DOMAINS) {
    const dist = editDistance(domain, cd);
    if (dist < bestDist) { bestDist = dist; best = cd; }
  }
  const threshold = domain.length >= 8 ? 2 : 1;
  return best && bestDist > 0 && bestDist <= threshold ? best : null;
}

/** يرجّع: خطأ (نص) أو اقتراح تصحيح أو null (سليم) */
export function checkEmail(raw: string): { error?: string; suggest?: string } {
  const email = raw.trim().toLowerCase();
  if (!email) return { error: "اكتب بريدك" };
  const parts = email.split("@");
  if (parts.length !== 2) return { error: "البريد يحتاج علامة @ واحدة" };
  const [local, domain] = parts;
  if (!local) return { error: "الجزء قبل @ ناقص" };
  if (!domain) return { error: "النطاق بعد @ ناقص" };
  if (!domain.includes(".")) return { error: "النطاق ناقص نقطة (مثل gmail.com)" };
  if (domain.startsWith(".") || domain.endsWith(".")) return { error: "تأكّد من موضع النقطة بالنطاق" };
  if (domain.includes("..") || local.includes("..")) return { error: "نقطتان متتاليتان — تأكّد من البريد" };
  if (/[^\w.+-]/.test(local)) return { error: "البريد يحتوي رمزاً غير مسموح" };
  if (/\s/.test(email)) return { error: "البريد يحتوي مسافة" };
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return { error: "امتداد النطاق قصير — تأكّد منه" };

  const near = suggestDomain(domain);
  if (near) return { suggest: email.replace(/@.+$/, "@" + near) };
  return {};
}
