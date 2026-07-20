/** تطبيع رقم الهاتف العراقي: يقبل 07XXXXXXXXX أو 7XXXXXXXXX أو +964... → يوحّده لـ 07XXXXXXXXX */
export function normalizeIqPhone(raw: string): string | null {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("07")) return d;        // 07XXXXXXXXX
  if (d.length === 9 && d.startsWith("7")) return "0" + d;     // 7XXXXXXXXX → 07…
  if (d.length === 11 && d.startsWith("07")) return d.slice(0, 11);
  return null;
}
export function isValidIqPhone(raw: string): boolean {
  return normalizeIqPhone(raw) !== null;
}
/** صيغة دولية للواتساب: 9647XXXXXXXXX */
export function toWaNumber(raw: string): string {
  const n = normalizeIqPhone(raw);
  return n ? "964" + n.slice(1) : raw.replace(/\D/g, "");
}
