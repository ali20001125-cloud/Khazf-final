/** جلب بيانات الزبون مرة واحدة ومشاركتها — بدل استدعاء منفصل بكل صفحة */

export type MeShape = {
  guest?: boolean; googleSession?: boolean; linked?: boolean; hasAuth?: boolean;
  phone?: string | null; name?: string | null; email?: string | null;
  governorate?: string | null; address?: string | null;
  pointsBalance?: number; pointsValueDinars?: number;
  journeyOrders?: number; journeyActive?: boolean;
  journeyLevels?: { level: number; rewardType: string; value: number; giftName: string | null }[];
  orders?: unknown[];
  [k: string]: unknown;
};

let cache: MeShape | null = null;
let inflight: Promise<MeShape> | null = null;
let cachedAt = 0;

const TTL = 60_000; // دقيقة — كافية لتصفّح متتابع، وتتجدّد بعدها

export function fetchMe(force = false): Promise<MeShape> {
  const fresh = cache && Date.now() - cachedAt < TTL;
  if (!force && fresh) return Promise.resolve(cache as MeShape);
  if (!force && inflight) return inflight;

  inflight = fetch("/api/customer/me/")
    .then((r) => r.json())
    .then((d: MeShape) => {
      cache = d;
      cachedAt = Date.now();
      return d;
    })
    .catch(() => (cache ?? { guest: true }) as MeShape)
    .finally(() => { inflight = null; });

  return inflight;
}

/** يُبطل الذاكرة بعد أي تغيير (طلب جديد، تعديل بيانات، تسجيل خروج) */
export function invalidateMe() {
  cache = null;
  cachedAt = 0;
}
