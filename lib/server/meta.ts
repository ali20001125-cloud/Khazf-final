/**
 * جسر Meta Marketing API — أداء الإعلانات + التفصيل الديموغرافي (عمر · جنس · منطقة).
 * متغيّرات: META_ACCESS_TOKEN · META_AD_ACCOUNT_ID · (اختياري) META_USD_TO_IQD.
 */
const API = "https://graph.facebook.com/v21.0";

export type DateArg = { preset: string } | { since: string; until: string };
function dateParam(d: DateArg): string {
  if ("preset" in d) {
    const p = ["today", "yesterday", "last_7d", "last_30d"].includes(d.preset) ? d.preset : "last_7d";
    return `date_preset=${p}`;
  }
  return `time_range=${encodeURIComponent(JSON.stringify({ since: d.since, until: d.until }))}`;
}

function creds() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  let id = process.env.META_AD_ACCOUNT_ID?.trim();
  if (id && !id.startsWith("act_")) id = "act_" + id.replace(/[^0-9]/g, "");
  return { token, id };
}

/** سعر صرف الدولار للدينار (لحساب عائد المتجر) — قابل للضبط عبر البيئة */
export const USD_TO_IQD = Number(process.env.META_USD_TO_IQD || 1310);

const PURCHASE_TYPES = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
function pickAction(arr: unknown, types: string[]): number {
  if (!Array.isArray(arr)) return 0;
  for (const t of types) {
    const a = arr.find((x) => (x as { action_type?: string }).action_type === t);
    if (a) return Number((a as { value?: string }).value ?? 0);
  }
  return 0;
}
const num = (x: unknown) => (x == null ? 0 : Number(x));

export type MetaInsights = {
  ok: boolean; error?: string;
  spend: number; impressions: number; clicks: number; ctr: number; cpc: number; reach: number;
  purchases: number; purchaseValue: number; roas: number; costPerPurchase: number; currency: string;
};
const EMPTY = (over: Partial<MetaInsights>): MetaInsights => ({
  ok: false, spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, reach: 0,
  purchases: 0, purchaseValue: 0, roas: 0, costPerPurchase: 0, currency: "", ...over,
});

export type Campaign = { id: string; name: string; start?: string; stop?: string };
/** قائمة الحملات — مع تاريخ البداية/النهاية لاختيار المدّة تلقائياً */
export async function fetchMetaCampaigns(): Promise<Campaign[]> {
  const { token, id } = creds();
  if (!token || !id) return [];
  const url = `${API}/${id}/campaigns?fields=name,start_time,stop_time&limit=100&access_token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (j.error) return [];
    const day = (v: unknown) => (v ? String(v).slice(0, 10) : undefined);
    return (j.data ?? []).map((c: Record<string, unknown>) => ({
      id: String(c.id), name: String(c.name), start: day(c.start_time), stop: day(c.stop_time),
    }));
  } catch {
    return [];
  }
}

export async function fetchMetaInsights(d: DateArg, node?: string): Promise<MetaInsights> {
  const { token, id } = creds();
  if (!token || !id) return EMPTY({ error: "غير مربوط — أضف META_ACCESS_TOKEN وMETA_AD_ACCOUNT_ID في هوستنجر" });
  const fields = "spend,impressions,clicks,ctr,cpc,reach,account_currency,actions,action_values,purchase_roas";
  const url = `${API}/${node || id}/insights?fields=${fields}&${dateParam(d)}&access_token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (j.error) return EMPTY({ error: `Meta: ${j.error.message || "خطأ"}` });
    const row = j.data?.[0];
    if (!row) return { ...EMPTY({}), ok: true };
    const spend = num(row.spend);
    const purchases = pickAction(row.actions, PURCHASE_TYPES);
    const purchaseValue = pickAction(row.action_values, PURCHASE_TYPES);
    const roas = pickAction(row.purchase_roas, PURCHASE_TYPES) || (spend > 0 ? purchaseValue / spend : 0);
    return {
      ok: true, spend, impressions: num(row.impressions), clicks: num(row.clicks),
      ctr: num(row.ctr), cpc: num(row.cpc), reach: num(row.reach),
      purchases, purchaseValue, roas, costPerPurchase: purchases > 0 ? spend / purchases : 0,
      currency: String(row.account_currency ?? ""),
    };
  } catch {
    return EMPTY({ error: "تعذّر الاتصال بـ Meta — تأكّد من التوكن" });
  }
}

export type BreakRow = { label: string; spend: number; clicks: number; purchases: number };
/** تفصيل حسب عمر/جنس/منطقة — من جمهور إعلانك */
export async function fetchMetaBreakdown(d: DateArg, breakdowns: string, node?: string): Promise<{ rows: BreakRow[]; error?: string }> {
  const { token, id } = creds();
  if (!token || !id) return { rows: [], error: "غير مربوط" };
  const url = `${API}/${node || id}/insights?fields=spend,clicks,actions&breakdowns=${breakdowns}&${dateParam(d)}&limit=200&access_token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (j.error) return { rows: [], error: j.error.message };
    const genderAr: Record<string, string> = { male: "ذكور", female: "إناث", unknown: "غير محدّد" };
    const rows: BreakRow[] = (j.data ?? []).map((row: Record<string, unknown>) => {
      const parts: string[] = [];
      if (row.age) parts.push(String(row.age));
      if (row.gender) parts.push(genderAr[String(row.gender)] ?? String(row.gender));
      if (row.region) parts.push(String(row.region));
      return { label: parts.join(" · ") || "—", spend: num(row.spend), clicks: num(row.clicks), purchases: pickAction(row.actions, PURCHASE_TYPES) };
    });
    return { rows };
  } catch {
    return { rows: [], error: "تعذّر الاتصال بـ Meta" };
  }
}
