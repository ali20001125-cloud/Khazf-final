/**
 * جسر Google Gemini — مساعد المتجر الذكي (مجاني).
 * متغيّر البيئة: GEMINI_API_KEY · (اختياري) GEMINI_MODEL.
 */
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

export type Turn = { role: "user" | "model"; text: string };
export type GeminiResult = { ok: boolean; text: string; error?: string };

/** يسأل Gemini بتعليمات نظام + سجل محادثة، ويرجّع نصاً عربياً */
export async function askGemini(system: string, turns: Turn[]): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, text: "", error: "المساعد غير مربوط — أضف GEMINI_API_KEY في هوستنجر." };

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, topP: 0.95 },
  };
  const url = `${API}/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const j = await r.json();
    if (j.error) return { ok: false, text: "", error: `Gemini: ${j.error.message || "خطأ"}` };
    const text = (j.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text || "")
      .join("").trim();
    if (!text) {
      const blocked = j.promptFeedback?.blockReason || j.candidates?.[0]?.finishReason;
      return { ok: false, text: "", error: blocked ? `تعذّر توليد الرد (${blocked})` : "رد فارغ من Gemini" };
    }
    return { ok: true, text };
  } catch {
    return { ok: false, text: "", error: "تعذّر الاتصال بـ Gemini — تأكّد من المفتاح والإنترنت." };
  }
}

/** هل المساعد مربوط؟ */
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();
