/** إشعار تيليجرام — أفضل جهد: فشله لا يُفشل الطلب أبداً */
import { getInternalSettings } from "./settings";

/** رقم عراقي بالصيغة الدولية (بلا صفر، بمفتاح 964) — جاهز للنسخ لواتساب */
export function intlPhone(phone: string): string {
  const d = (phone || "").replace(/[^0-9]/g, "");
  if (d.startsWith("964")) return d;
  return "964" + d.replace(/^0+/, "");
}

type OrderMsg = {
  orderNumber: string; seqNo?: number | null; name: string; phone: string;
  governorate: string; address: string; total: number;
  items: { name: string; qty: number; line: number }[];
  invoiceUrl: string;
  itemsSubtotal?: number;      // مجموع المنتجات قبل التوصيل
  deliveryCharged?: number;    // التوصيل المدفوع (منفرد)
  journeyDiscount?: number;    // خصم الرحلة/الولاء
  journeyPct?: number;         // نسبة الخصم المعروضة
  pointsUsed?: number;         // الكاش باك المستخدم
};

export async function notifyTelegram(text: string): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.notifyNewOrder || !s.telegramBotToken || !s.telegramChatId) return false;
    const res = await fetch(`https://api.telegram.org/bot${s.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: s.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** رسالة طلب مفصّلة + زر الفاتورة */
export async function notifyOrderTelegram(
  o: OrderMsg & { email?: string | null; registered?: boolean }
): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.notifyNewOrder || !s.telegramBotToken || !s.telegramChatId) return false;
    const lines = o.items.map((it) => `• ${it.name} ×${it.qty} — ${it.line.toLocaleString("en")}`).join("\n");
    const money = (n: number) => n.toLocaleString("en");
    let breakdown = "";
    if (o.itemsSubtotal != null) breakdown += `المنتجات: ${money(o.itemsSubtotal)} د.ع\n`;
    if (o.journeyDiscount) breakdown += `خصم الولاء${o.journeyPct ? ` (${o.journeyPct}٪)` : ""}: −${money(o.journeyDiscount)} د.ع\n`;
    if (o.pointsUsed) breakdown += `كاش باك مستخدم: −${money(o.pointsUsed)} د.ع\n`;
    breakdown += `التوصيل: ${o.deliveryCharged ? money(o.deliveryCharged) + " د.ع" : "مجاني"}\n`;
    const text =
      `🆕 <b>طلب جديد #${o.seqNo ?? "?"}</b>\n` +
      `━━━━━━━━━━━━\n` +
      `👤 ${o.name}\n📞 ${o.phone}\n💬 <code>${intlPhone(o.phone)}</code>\n` +
      (o.email ? `✉️ ${o.email}\n` : "✉️ بلا بريد\n") +
      `${o.registered ? "✅ مسجّل بحساب" : "⚪️ غير مسجّل"}\n📍 ${o.governorate} — ${o.address}\n` +
      `━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━\n` +
      breakdown +
      `💰 <b>الإجمالي: ${money(o.total)} د.ع</b> (كاش)\n` +
      `🧾 فاتورة: ${o.orderNumber}`;

    // رسالة واتساب جاهزة — قصيرة
    const d = (n: number) => new Date(Date.now() + n * 864e5)
      .toLocaleDateString("ar-IQ", { weekday: "long", day: "numeric", month: "long" });
    const waMsg =
      `مرحباً ${o.name} 🤎\n\n` +
      `استلمنا طلبك ${o.orderNumber} وجارٍ تجهيزه.\n\n` +
      o.items.map((it) => `• ${it.name} ×${it.qty}`).join("\n") + "\n\n" +
      `الإجمالي: ${money(o.total)} د.ع (${o.deliveryCharged ? "شامل التوصيل" : "توصيل مجاني"})\n` +
      `التوصيل: ${o.governorate}\n` +
      `الوصول: بين ${d(1)} و${d(2)} — الدفع عند الاستلام\n\n` +
      `للتعديل أو تغيير الموعد راسلنا هنا.\n` +
      `وبإمكانك إنشاء حساب على khazf.shop لتتبّع طلباتك والحصول على الخصومات والهدايا.`;

    const base = `https://api.telegram.org/bot${s.telegramBotToken}`;
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: s.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[
          { text: "🧾 الفاتورة", url: o.invoiceUrl },
          { text: "💬 أرسل تأكيد الطلب", url: `https://wa.me/${intlPhone(o.phone)}?text=${encodeURIComponent(waMsg)}` },
        ]] },
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ═══════════ تذكير السلة عبر واتساب (يدوي) ═══════════ */

type AbandonedCartMsg = {
  name: string | null;
  phone: string;
  items: { name: string; qty: number; price: number }[];
  itemsTotal: number;
  waMessage: string; // نص الواتساب الجاهز للإرسال
};

/**
 * إشعار تيليجرام بسلة متروكة لزبون له رقم بلا إيميل.
 * يرسل: بيانات الزبون + سلته + نص واتساب جاهز + زر يفتح محادثته مباشرة.
 * التاجر يقرّر الإرسال يدوياً.
 */
export async function notifyAbandonedCartTelegram(c: AbandonedCartMsg): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.telegramBotToken || !s.telegramChatId) return false;
    const money = (n: number) => n.toLocaleString("en");
    const lines = c.items.map((it) => `• ${it.name} ×${it.qty} — ${money(it.price)}`).join("\n");

    // رقم واتساب دولي (964 بلا صفر البداية)
    const waNum = c.phone.replace(/[^0-9]/g, "").replace(/^0/, "964");
    const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(c.waMessage)}`;

    const text =
      `🛒 <b>سلة متروكة — تذكير واتساب</b>\n` +
      `━━━━━━━━━━━━\n` +
      `👤 ${c.name || "زبون"}\n📞 ${c.phone}\n` +
      `━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━\n` +
      `💰 <b>${money(c.itemsTotal)} د.ع</b>\n\n` +
      `📝 <b>الرسالة الجاهزة:</b>\n<code>${c.waMessage}</code>\n\n` +
      `اضغط الزر لفتح محادثته بالرسالة جاهزة 👇`;

    const base = `https://api.telegram.org/bot${s.telegramBotToken}`;
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: s.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "💬 فتح واتساب الزبون", url: waUrl }]] },
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ═══════════ إشعار تسجيل زبون جديد ═══════════ */

type NewCustomerMsg = {
  name: string | null;
  phone: string | null;
  email: string | null;
  governorate?: string | null;
  address?: string | null;
  source: "email" | "google" | "phone";
  totalCustomers?: number;
};

/** يُشعر التاجر عند تسجيل زبون جديد (بريد أو Google) */
export async function notifyNewCustomerTelegram(c: NewCustomerMsg): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.telegramBotToken || !s.telegramChatId) return false;

    const srcLabel = c.source === "google" ? "Google" : c.source === "email" ? "البريد" : "الهاتف";
    const lines = [
      `🎉 <b>زبون جديد سجّل</b>`,
      `━━━━━━━━━━━━`,
      `👤 ${c.name || "—"}`,
      c.phone ? `📞 ${c.phone}` : null,
      c.phone ? `💬 <code>${intlPhone(c.phone)}</code>` : null,
      c.email ? `✉️ ${c.email}` : null,
      c.governorate ? `📍 ${c.governorate}${c.address ? " — " + c.address : ""}` : null,
      `🔑 التسجيل عبر: ${srcLabel}`,
      c.totalCustomers != null ? `━━━━━━━━━━━━\n👥 إجمالي العملاء: <b>${c.totalCustomers.toLocaleString("en")}</b>` : null,
    ].filter(Boolean).join("\n");

    const base = `https://api.telegram.org/bot${s.telegramBotToken}`;
    const body: Record<string, unknown> = {
      chat_id: s.telegramChatId, text: lines, parse_mode: "HTML", disable_web_page_preview: true,
    };
    if (c.phone) {
      body.reply_markup = { inline_keyboard: [[
        { text: "💬 مراسلة الزبون واتساب", url: `https://wa.me/${intlPhone(c.phone)}` },
      ]] };
    }
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
