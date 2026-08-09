/**
 * أحداث التجارة الإلكترونية — GA4
 * تُرسل بالدينار العراقي، ولا تعمل ببيئة الاختبار ولا للأجهزة المستثناة.
 */

type Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
  item_variant?: string;
};

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

/** أجهزة الاختبار وبيئة الاختبار لا ترسل أحداثاً */
function blocked(): boolean {
  if (typeof window === "undefined") return true;
  if (process.env.NEXT_PUBLIC_ENV === "staging") return true;
  return document.cookie.includes("khz_no_track=1");
}

function send(event: string, params: Record<string, unknown>) {
  if (blocked() || !window.gtag) return;
  window.gtag("event", event, { currency: "IQD", ...params });
}

/** مشاهدة منتج */
export function gaViewItem(item: Item) {
  send("view_item", { value: item.price, items: [item] });
}

/** إضافة للسلة */
export function gaAddToCart(item: Item) {
  send("add_to_cart", { value: item.price * (item.quantity ?? 1), items: [item] });
}

/** حذف من السلة */
export function gaRemoveFromCart(item: Item) {
  send("remove_from_cart", { value: item.price * (item.quantity ?? 1), items: [item] });
}

/** فتح السلة */
export function gaViewCart(items: Item[], value: number) {
  send("view_cart", { value, items });
}

/** بدء الدفع */
export function gaBeginCheckout(items: Item[], value: number, coupon?: string | null) {
  send("begin_checkout", { value, items, ...(coupon ? { coupon } : {}) });
}

/** إتمام الشراء — مرة واحدة لكل رقم طلب */
export function gaPurchase(o: {
  transactionId: string;
  value: number;            // قيمة المنتجات بعد الخصم، بلا توصيل
  shipping?: number;
  discount?: number;
  coupon?: string | null;
  items: Item[];
}) {
  if (blocked()) return;
  // حماية من التكرار عند إعادة تحميل صفحة النجاح
  const key = `ga_purchase_${o.transactionId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch { /* تجاهل */ }

  send("purchase", {
    transaction_id: o.transactionId,
    value: o.value,
    shipping: o.shipping ?? 0,
    items: o.items,
    ...(o.coupon ? { coupon: o.coupon } : {}),
  });
}
