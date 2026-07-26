/**
 * فحص نطاق الإيميل عبر سجلّات MX (DNS) — يتأكّد أن النطاق حقيقي يستقبل بريداً.
 * بحذر: لو الفحص نفسه فشل (شبكة/مهلة)، نعتبر النطاق مقبولاً (لا نمنع زبوناً حقيقياً).
 *
 * الردّ:
 *   { ok: true }                    النطاق حقيقي (له MX) — أرسل
 *   { ok: false, suggest: "..." }   النطاق غير موجود + اقتراح أقرب نطاق شائع
 *   { ok: true, unchecked: true }   تعذّر الفحص — نمرّر بحذر
 */
import { NextResponse } from "next/server";
import { resolveMx } from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMON_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com",
  "icloud.com", "live.com", "protonmail.com", "yahoo.co.uk",
  "khazf.shop", "me.com", "aol.com", "mail.com", "googlemail.com", "ymail.com",
];

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i);
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

function nearestDomain(domain: string): string | null {
  if (COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null, bestDist = 99;
  for (const cd of COMMON_DOMAINS) {
    const dist = editDistance(domain, cd);
    if (dist < bestDist) { bestDist = dist; best = cd; }
  }
  const threshold = domain.length >= 8 ? 3 : 2;
  return best && bestDist > 0 && bestDist <= threshold ? best : null;
}

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  const domain = email.split("@")[1];
  if (!domain) return NextResponse.json({ ok: false, suggest: null });

  // النطاقات الشائعة معروفة الصحّة — لا داعي لفحص شبكي
  if (COMMON_DOMAINS.includes(domain)) return NextResponse.json({ ok: true });

  try {
    // مهلة 4 ثوانٍ للفحص (حتى لا يعلّق المستخدم)
    const mx = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
    ]);
    if (Array.isArray(mx) && mx.length > 0) {
      // النطاق حقيقي يستقبل بريداً ✓
      return NextResponse.json({ ok: true });
    }
    // لا سجلّات MX — النطاق لا يستقبل بريداً → نقترح الأقرب
    return NextResponse.json({ ok: false, suggest: nearestDomain(domain) });
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    // ENOTFOUND/ENODATA = النطاق غير موجود فعلاً → نقترح
    if (msg.includes("ENOTFOUND") || msg.includes("ENODATA")) {
      return NextResponse.json({ ok: false, suggest: nearestDomain(domain) });
    }
    // أي فشل آخر (مهلة/شبكة) — نمرّر بحذر حتى لا نمنع زبوناً حقيقياً
    return NextResponse.json({ ok: true, unchecked: true });
  }
}
