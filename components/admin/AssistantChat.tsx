"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "model"; text: string };

const SUGGESTIONS = [
  "ليش مبيعاتي هالأسبوع هيچي؟",
  "أي منتج ينشاف كثير بس قليل شراء؟",
  "شلون أقلّل نسبة الارتداد؟",
  "منو زبائني الأفضل وشلون أرجّعهم؟",
];

/** يحوّل نص Gemini (ماركداون بسيط) لعناصر: عناوين، نقاط، عريض */
function render(text: string) {
  return text.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    const bold = t.replace(/^\s*[#*\-–•]+\s*/, "");
    const parts = bold.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j} className="font-bold text-ink">{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>
    );
    const isBullet = /^\s*[*\-–•]\s/.test(line) || /^[١٢٣٤٥٦٧٨٩0-9]+[).]/.test(t);
    return (
      <p key={i} className={`${isBullet ? "ps-3" : ""} leading-relaxed`}>
        {isBullet && <span className="text-accent">• </span>}{parts}
      </p>
    );
  });
}

export default function AssistantChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || loading) return;
    setError(null);
    const history = msgs.slice(-6);
    const next = [...msgs, { role: "user" as const, text: question }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/assistant/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "تعذّر الرد"); setMsgs(msgs); return; }
      setMsgs([...next, { role: "model", text: d.answer }]);
    } catch {
      setError("تعذّر الاتصال. حاول مرّة ثانية.");
      setMsgs(msgs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <p className="text-[14px] font-bold">اسأل المساعد</p>
        <p className="mt-0.5 text-[11px] text-muted">يجاوبك من أرقام متجرك الحقيقية — ليش وشلون وحلول.</p>
      </div>

      <div className="max-h-[440px] min-h-[120px] space-y-3 overflow-y-auto p-4 text-[13px]">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="rounded-full border border-line bg-bg px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-bg-alt hover:text-ink">
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-[10px] px-3.5 py-2.5 ${
              m.role === "user" ? "bg-olive text-olive-text" : "border border-line bg-bg text-ink"
            }`}>
              {m.role === "user" ? <p className="leading-relaxed">{m.text}</p> : <div className="space-y-0.5">{render(m.text)}</div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-[10px] border border-line bg-bg px-3.5 py-2.5 text-muted">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
              </span>
            </div>
          </div>
        )}
        {error && <p className="text-[12px] text-accent">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-2 border-t border-line p-3">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك…" disabled={loading}
          className="min-w-0 flex-1 rounded-[8px] border border-line bg-bg px-3.5 py-2.5 text-[13px] outline-none focus:border-olive" />
        <button type="submit" disabled={loading || !input.trim()}
          className="shrink-0 rounded-[8px] bg-olive px-4 py-2.5 text-[13px] font-bold text-olive-text disabled:opacity-50">
          إرسال
        </button>
      </form>
    </div>
  );
}
