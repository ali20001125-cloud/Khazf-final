/**
 * جسر Meta Marketing API — يقرأ أداء الإعلانات (صرف · نتائج · ROAS) بتوكن read-only.
 * يعتمد متغيّرَي البيئة: META_ACCESS_TOKEN و META_AD_ACCOUNT_ID.
 */
const API = "https://graph.facebook.com/v21.0";

function acctId(): string | null {
  let id = process.env.META_AD_ACCOUNT_ID?.trim();
  if (!id) return null;
  if (!id.startsWith("act_")) id = "act_" + id.replace(/[^0-9]/g, "");
  return id;
}

export type MetaInsights = {
  ok: boolean;
  error?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;          // نسبة النقر ٪
  cpc: number;          // كلفة النقرة
  reach: number;
  purchases: number;        // مشتريات (حسب Meta/البكسل)
  purchaseValue: number;    // قيمة المشتريات
  roas: number;             // العائد على الإنفاق
  costPerPurchase: number;
  currency: string;
};

const EMPTY = (over: Partial<MetaInsights>): MetaInsights => ({
  ok: false, spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, reach: 0,
  purchases: 0, purchaseValue: 0, roas: 0, costPerPurchase: 0, currency: "", ...over,
});

const PURCHASE_TYPES = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
function pickAction(arr: unknown, types: string[]): number {
  if (!Array.isArray(arr)) return 0;
  for (const t of types) {
    const a = arr.find((x) => (x as { action_type?: string }).action_type === t);
    if (a) return Number((a as { value?: string }).value ?? 0);
  }
  return 0;
}

export async function fetchMetaInsights(datePreset: string): Promise<MetaInsights> {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const id = acctId();
  if (!token || !id)
    return EMPTY({ error: "غير مربوط — أضف META_ACCESS_TOKEN وMETA_AD_ACCOUNT_ID في هوستنجر" });

  const preset = ["today", "yesterday", "last_7d", "last_30d"].includes(datePreset) ? datePreset : "last_7d";
  const fields = "spend,impressions,clicks,ctr,cpc,reach,account_currency,actions,action_values,purchase_roas";
  const url = `${API}/${id}/insights?fields=${fields}&date_preset=${preset}&access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (j.error) return EMPTY({ error: `Meta: ${j.error.message || "خطأ"}` });
    const row = j.data?.[0];
    if (!row) return { ...EMPTY({}), ok: true };
    const n = (x: unknown) => (x == null ? 0 : Number(x));
    const spend = n(row.spend);
    const purchases = pickAction(row.actions, PURCHASE_TYPES);
    const purchaseValue = pickAction(row.action_values, PURCHASE_TYPES);
    const roas = pickAction(row.purchase_roas, PURCHASE_TYPES) || (spend > 0 ? purchaseValue / spend : 0);
    return {
      ok: true,
      spend, impressions: n(row.impressions), clicks: n(row.clicks),
      ctr: n(row.ctr), cpc: n(row.cpc), reach: n(row.reach),
      purchases, purchaseValue, roas,
      costPerPurchase: purchases > 0 ? spend / purchases : 0,
      currency: String(row.account_currency ?? ""),
    };
  } catch {
    return EMPTY({ error: "تعذّر الاتصال بـ Meta — تأكّد من التوكن" });
  }
}
