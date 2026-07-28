/** أحداث Meta Pixel — دالة موحّدة آمنة (تعمل فقط إن كان Pixel محمّلاً) */
type FbParams = {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
};

export function fbTrack(event: string, params?: FbParams) {
  if (typeof window === "undefined") return;
  // @ts-expect-error fbq عام يُحقن من layout
  if (typeof window.fbq === "function") {
    // @ts-expect-error fbq عام
    window.fbq("track", event, params ?? {});
  }
}
