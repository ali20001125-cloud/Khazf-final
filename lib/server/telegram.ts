/** إشعار تيليجرام — أفضل جهد: فشله لا يُفشل الطلب أبداً */
import { getInternalSettings } from "./settings";

export async function notifyTelegram(text: string): Promise<boolean> {
  try {
    const s = await getInternalSettings();
    if (!s.notifyNewOrder || !s.telegramBotToken || !s.telegramChatId) return false;
    const res = await fetch(`https://api.telegram.org/bot${s.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: s.telegramChatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false; // البيئة المحلية تحجب تيليجرام — يشتغل على الاستضافة
  }
}
