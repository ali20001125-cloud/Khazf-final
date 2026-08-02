/** أحداث Meta Pixel — دالة موحّدة آمنة (تعمل فقط إن كان Pixel محمّلاً) */
type FbParams = {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
};

/** أجهزة الاختبار المستثناة لا ترسل أحداثاً — تفسد استهداف الإعلانات */
function excluded(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("khz_no_track=1");
}

export function fbTrack(event: string, params?: FbParams) {
  if (excluded()) return;
  if (typeof window === "undefined") return;
  // @ts-expect-error fbq عام يُحقن من layout
  if (typeof window.fbq === "function") {
    // @ts-expect-error fbq عام
    window.fbq("track", event, params ?? {});
  }
}
