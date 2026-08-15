/**
 * جسر Google Gemini — مساعد المتجر الذكي (مجاني).
 * متغيّر البيئة: GEMINI_API_KEY · (اختياري) GEMINI_MODEL.
 * يجرّب عدّة موديلات بالترتيب فإذا أُوقف واحد ينتقل للتالي تلقائياً.
 */
const API = "https://generativelanguage.googleapis.com/v1beta/models";

/** أولوية الموديلات — الأحدث أولاً، ثم بدائل. GEMINI_MODEL يتقدّم على الكل. */
const MODELS = process.env.GEMINI_MODEL?.trim()
  ? [process.env.GEMINI_MODEL.trim()]
  : ["gemini-flash-latest", "gemini-2.5-flash-latest", "gemini-2.0-flash", "gemini-flash-lite-latest"];

let workingModel: string | null = null; // يُخزَّن أوّل موديل نجح لتفادي المحاولات المتكرّرة

export type Turn = { role: "user" | "model"; text: string };
export type GeminiResult = { ok: boolean; text: string; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** هل رسالة الخطأ تعني أنّ الموديل غير متوفّر (فننتقل للتالي)؟ */
function modelUnavailable(status: number, msg: string): boolean {
  const m = msg.toLowerCase();
  return status === 404 || m.includes("no longer available") || m.includes("not available")
    || m.includes("not found") || m.includes("is not supported") || m.includes("does not exist");
}

/** هل الخطأ مؤقّت (زحمة/تحميل) فنعيد المحاولة؟ */
function overloaded(status: number, msg: string): boolean {
  const m = msg.toLowerCase();
  return status === 503 || status === 429 || m.includes("high demand") || m.includes("overloaded")
    || m.includes("try again later") || m.includes("unavailable");
}

async function callOnce(model: string, key: string, body: unknown): Promise<{ text?: string; error?: string; unavailable?: boolean; retry?: boolean }> {
  const url = `${API}/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const j = await r.json();
  if (j.error) {
    const msg = j.error.message || "خطأ";
    return { error: `Gemini: ${msg}`, unavailable: modelUnavailable(r.status, msg), retry: overloaded(r.status, msg) };
  }
  const text = (j.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) {
    const blocked = j.promptFeedback?.blockReason || j.candidates?.[0]?.finishReason;
    return { error: blocked ? `تعذّر توليد الرد (${blocked})` : "رد فارغ من Gemini" };
  }
  return { text };
}

/** يسأل Gemini بتعليمات نظام + سجل محادثة، ويرجّع نصاً عربياً */
export async function askGemini(system: string, turns: Turn[]): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, text: "", error: "المساعد غير مربوط — أضف GEMINI_API_KEY في هوستنجر." };

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048, topP: 0.95 },
  };

  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  let lastError = "تعذّر الاتصال بـ Gemini";
  let sawOverload = false;
  for (const model of order) {
    // محاولتان لكل موديل: عند الزحمة ننتظر قليلاً ثم نعيد، وإلا ننتقل لموديل أخف
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await callOnce(model, key, body);
        if (res.text) { workingModel = model; return { ok: true, text: res.text }; }
        lastError = res.error || lastError;
        if (res.unavailable) break;                    // غير متوفّر → الموديل التالي
        if (res.retry) {                               // زحمة → أعِد ثم انتقل
          sawOverload = true;
          if (attempt === 0) { await sleep(1400); continue; }
          break;
        }
        return { ok: false, text: "", error: lastError }; // خطأ حقيقي (مفتاح/حظر)
      } catch {
        lastError = "تعذّر الاتصال بـ Gemini — تأكّد من المفتاح والإنترنت.";
      }
    }
  }
  if (sawOverload) lastError = "المساعد مزدحم حالياً لدى Google — جرّب بعد لحظات.";
  return { ok: false, text: "", error: lastError };
}

/** هل المساعد مربوط؟ */
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();
