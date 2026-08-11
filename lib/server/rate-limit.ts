/**
 * محدِّد معدّل بسيط في الذاكرة — نافذة منزلقة لكل مفتاح (IP + مجموعة).
 * يكفي للنشر بعملية واحدة (هوستنجر). لو تعدّدت العمليات/الخوادم لاحقاً،
 * انقل العدّاد لقاعدة أو Redis ليكون مشتركاً.
 *
 * ملاحظة: الشبكات العراقية تستعمل CGNAT بكثرة (كثير مستخدمين خلف IP واحد)،
 * لذا الحدود سخيّة عمداً — تمنع الفيضان المبرمَج لا الزبون الحقيقي.
 */
type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return; // كنس كل دقيقة على الأكثر
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

/** يعيد true إن كان الطلب مسموحاً، false إن تجاوز الحدّ. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= limit) return false;
  cur.count++;
  return true;
}

/** أفضل تخمين لعنوان العميل خلف بروكسي هوستنجر. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
