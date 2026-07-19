/** إشعار تيليجرام — أفضل جهد: فشله لا يُفشل الطلب أبداً */
import { getInternalSettings } from "./settings";

type OrderMsg = {
  orderNumber: string; seqNo?: number | null; name: string; phone: string;
  governorate: string; address: string; total: number;
  items: { name: string; qty: number; line: number }[];
  invoiceUrl: string;
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
export async function notifyOrderTelegram(o: OrderMsg): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.notifyNewOrder || !s.telegramBotToken || !s.telegramChatId) return false;
    const lines = o.items.map((it) => `• ${it.name} ×${it.qty} — ${it.line.toLocaleString("en")}`).join("\n");
    const text =
      `🆕 <b>طلب جديد #${o.seqNo ?? "?"}</b>\n` +
      `━━━━━━━━━━━━\n` +
      `👤 ${o.name}\n📞 ${o.phone}\n📍 ${o.governorate} — ${o.address}\n` +
      `━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━\n` +
      `💰 <b>الإجمالي: ${o.total.toLocaleString("en")} د.ع</b> (كاش)\n` +
      `🧾 فاتورة: ${o.orderNumber}`;
    const base = `https://api.telegram.org/bot${s.telegramBotToken}`;
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: s.telegramChatId, text, parse_mode: "HTML", disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "🧾 عرض الفاتورة", url: o.invoiceUrl }]] },
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
