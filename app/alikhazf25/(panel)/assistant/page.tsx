/** المساعد الذكي — ملخّص يومي تلقائي + دردشة. مدعوم بـ Gemini المجاني. */
import { geminiConfigured, askGemini } from "@/lib/server/gemini";
import { buildSnapshot } from "@/lib/server/snapshot";
import { assistantSystem, DAILY_PROMPT } from "@/lib/server/assistant";
import AssistantChat from "@/components/admin/AssistantChat";

export const dynamic = "force-dynamic";

/** عرض ماركداون بسيط (عناوين/نقاط/عريض) على الخادم */
function renderMd(text: string) {
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    const clean = t.replace(/^\s*[#*\-–•]+\s*/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j} className="font-bold text-ink">{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>
    );
    const bullet = /^\s*[*\-–•]\s/.test(line) || /^[١٢٣٤٥٦٧٨٩0-9]+[).]/.test(t);
    const heading = /^#{1,3}\s/.test(line) || (t.length < 40 && /^\*\*[^*]+\*\*$/.test(t));
    return (
      <p key={i} className={`${bullet ? "ps-3" : ""} ${heading ? "mt-2 text-[13.5px] font-bold text-ink" : "leading-relaxed"}`}>
        {bullet && <span className="text-accent">• </span>}{parts}
      </p>
    );
  });
}

export default async function AssistantPage() {
  if (!geminiConfigured()) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-[22px] font-bold">المساعد الذكي</h1>
        <div className="mt-4 rounded-[10px] border border-accent/30 bg-accent/5 p-5 text-[13px] leading-relaxed">
          <p className="font-bold text-accent">المساعد غير مربوط بعد</p>
          <p className="mt-2 text-muted">أضف مفتاح Gemini المجاني بهوستنجر ليعمل:</p>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-muted">
            <li>افتح <span className="font-num" dir="ltr">aistudio.google.com/apikey</span> وأنشئ مفتاحاً مجانياً.</li>
            <li>بهوستنجر ← Environment Variables ← أضف <span className="font-num" dir="ltr">GEMINI_API_KEY</span> بقيمة المفتاح.</li>
            <li>احفظ وانتظر إعادة النشر، ثم حدّث هذي الصفحة.</li>
          </ol>
        </div>
      </div>
    );
  }

  const snapshot = await buildSnapshot();
  const daily = await askGemini(assistantSystem(snapshot), [{ role: "user", text: DAILY_PROMPT }]);

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="text-[22px] font-bold">المساعد الذكي</h1>
        <p className="mt-1 text-[12.5px] text-muted">ملخّص يومك + اسأله أي شي عن متجرك — يجاوبك بالأرقام والحلول.</p>
      </div>

      <div className="mt-4 rounded-[10px] border border-olive/30 bg-olive/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[15px]">☀️</span>
          <p className="text-[14px] font-bold">ملخّص اليوم</p>
        </div>
        {daily.ok ? (
          <div className="space-y-0.5 text-[13px] text-muted">{renderMd(daily.text)}</div>
        ) : (
          <p className="text-[12.5px] text-accent">تعذّر توليد الملخّص: {daily.error}</p>
        )}
      </div>

      <div className="mt-4">
        <AssistantChat />
      </div>
    </div>
  );
}
