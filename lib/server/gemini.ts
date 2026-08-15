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

/** يسأل Google شنو الموديلات المتاحة لهذا المفتاح ويرتّبها (flash أولاً) */
async function discoverModels(key: string): Promise<string[]> {
  try {
    const r = await fetch(`${API}?key=${encodeURIComponent(key)}&pageSize=100`, { cache: "no-store" });
    const j = await r.json();
    const names: string[] = (j.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[]; name?: string }) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent") &&
        /gemini/i.test(m.name ?? "") &&
        !/(vision|embedding|aqa|image|tts|native-audio)/i.test(m.name ?? ""))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""));
    const score = (s: string) =>
      (/flash-lite/i.test(s) ? 2 : /flash/i.test(s) ? 3 : /pro/i.test(s) ? 1 : 0) +
      (/latest/i.test(s) ? 0.5 : 0);
    return names.sort((a, b) => score(b) - score(a)).slice(0, 4);
  } catch {
    return [];
  }
}

/** محاولة موديل واحد (محاولتان عند الزحمة) */
async function tryModel(model: string, key: string, body: unknown): Promise<{ text?: string; error?: string; unavailable?: boolean; overload?: boolean; hardFail?: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await callOnce(model, key, body);
      if (res.text) return { text: res.text };
      if (res.unavailable) return { error: res.error, unavailable: true };
      if (res.retry) { if (attempt === 0) { await sleep(1400); continue; } return { error: res.error, overload: true }; }
      return { error: res.error, hardFail: true }; // خطأ حقيقي (مفتاح/حظر)
    } catch {
      return { error: "تعذّر الاتصال بـ Gemini — تأكّد من المفتاح والإنترنت." };
    }
  }
  return { error: "تعذّر توليد الرد" };
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

  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : [...MODELS];
  let lastError = "تعذّر الاتصال بـ Gemini";
  let sawOverload = false;
  let sawUnavailable = false;

  const runList = async (list: string[]): Promise<GeminiResult | null> => {
    for (const model of list) {
      const res = await tryModel(model, key, body);
      if (res.text) { workingModel = model; return { ok: true, text: res.text }; }
      lastError = res.error || lastError;
      if (res.overload) sawOverload = true;
      if (res.unavailable) sawUnavailable = true;
      if (res.hardFail) return { ok: false, text: "", error: lastError }; // مفتاح/حظر — لا فائدة من المتابعة
    }
    return null;
  };

  const first = await runList(order);
  if (first) return first;

  /* لو كل الموديلات المعروفة غير متوفّرة → اكتشف المتاح لمفتاحك وجرّبه */
  if (sawUnavailable) {
    const discovered = (await discoverModels(key)).filter((m) => !order.includes(m));
    if (discovered.length) {
      const second = await runList(discovered);
      if (second) return second;
    }
  }

  if (sawOverload) lastError = "المساعد مزدحم حالياً لدى Google — جرّب بعد لحظات.";
  return { ok: false, text: "", error: lastError };
}

/** هل المساعد مربوط؟ */
export const geminiConfigured = () => !!process.env.GEMINI_API_KEY?.trim();
