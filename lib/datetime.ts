/** تنسيق التواريخ بتوقيت بغداد (UTC+3) — يُستخدم في كل المتجر واللوحة */

export const BAGHDAD_TZ = "Asia/Baghdad";

/** تاريخ ووقت كامل: ٣٠ يوليو ٢٠٢٦، ١٢:٤٠ ص */
export function fmtDateTime(d: Date | string | number): string {
  return new Date(d).toLocaleString("ar-IQ", {
    timeZone: BAGHDAD_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** تاريخ فقط: ٣٠ يوليو ٢٠٢٦ */
export function fmtDate(d: Date | string | number): string {
  return new Date(d).toLocaleDateString("ar-IQ", {
    timeZone: BAGHDAD_TZ,
    dateStyle: "medium",
  });
}

/** وقت فقط: ١٢:٤٠ ص */
export function fmtTime(d: Date | string | number): string {
  return new Date(d).toLocaleTimeString("ar-IQ", {
    timeZone: BAGHDAD_TZ,
    timeStyle: "short",
  });
}

/** تاريخ قصير بالأرقام اللاتينية: 2026-07-30 12:40 */
export function fmtShort(d: Date | string | number): string {
  const dt = new Date(d);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAGHDAD_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(dt);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}

/** اليوم الحالي بتوقيت بغداد بصيغة YYYY-MM-DD (لمفاتيح الملخّصات) */
export function baghdadDateKey(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAGHDAD_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}
