"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Sparkles, Check } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { useStore } from "@/lib/store";
import { useMotion } from "@/lib/motion";
import BagArt from "@/components/BagArt";

const questions = [
  {
    q: "شلون تحضّر قهوتك؟",
    options: [
      { label: "V60 / مقطّرة", v: "v60" },
      { label: "إسبريسو", v: "esp" },
      { label: "فرنش برس", v: "fp" },
      { label: "بعدني ما أعرف", v: "none" },
    ],
  },
  {
    q: "أي النكهات أقرب لقلبك؟",
    options: [
      { label: "فاكهية وعطرية", v: "fruit" },
      { label: "شوكولا ومكسرات", v: "choco" },
      { label: "كلاسيكية متوازنة", v: "classic" },
      { label: "أحب أكتشف الجديد", v: "explore" },
    ],
  },
  {
    q: "شعورك تجاه الحموضة؟",
    options: [
      { label: "أحبها واضحة ولامعة", v: "hi" },
      { label: "خفيفة ومتوازنة", v: "mid" },
      { label: "أفضّلها منخفضة", v: "lo" },
    ],
  },
];

function pick(ans: string[], coffees: ReturnType<typeof useCatalog>["coffees"], tools: ReturnType<typeof useCatalog>["tools"]) {
  const [, taste, acid] = ans;
  let slug = "dorado";
  if (taste === "fruit" || acid === "hi") slug = "kaldi";
  else if (taste === "choco" || acid === "lo") slug = "cerrado";
  else if (taste === "explore") slug = "antigua";
  const coffee = coffees.find((c) => c.slug === slug)!;

  const method = ans[0];
  const grind =
    method === "esp" ? "إسبريسو" : method === "fp" ? "فرنش برس" : "V60";
  const tool =
    (method === "esp"
      ? tools.find((t) => t.slug === "tamper-58")
      : method === "none"
        ? tools.find((t) => t.slug === "hand-grinder")
        : tools.find((t) => t.slug === "v60-dripper")) ?? null;
  return { coffee, grind, tool };
}

export default function StartPage() {
  const { coffees, tools } = useCatalog();
  const scope = useMotion();
  const { addToCart } = useStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [added, setAdded] = useState(false);

  const done = step >= questions.length;
  const result = done ? pick(answers, coffees, tools) : null;

  const answer = (v: string) => {
    setAnswers((a) => [...a, v]);
    setStep((s) => s + 1);
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
    setAdded(false);
  };

  const addBoth = () => {
    if (!result) return;
    addToCart({
      slug: result.coffee.slug,
      variant: "G250",
      grind: result.grind,
      name: result.coffee.name,
      meta: `٢٥٠غ · ${result.grind}`,
      priceShown: result.coffee.prices.g250,
    });
    if (result.tool)
      addToCart({ slug: result.tool.slug, variant: "PIECE", name: result.tool.name, priceShown: result.tool.price }, 1, true);
    setAdded(true);
  };

  return (
    <div ref={scope} className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <div className="text-center">
        <p className="reveal flex items-center justify-center gap-2 text-[12px] font-bold text-accent">
          <Sparkles size={14} /> مساعد خزف
        </p>
        <h1 className="reveal mt-2 text-3xl font-bold md:text-4xl">لا تعرف ماذا تختار؟</h1>
        <p className="reveal mt-2 text-sm text-muted">
          {done ? "هذا اختيارنا لك" : `سؤال ${step + 1} من ${questions.length}`}
        </p>
      </div>

      {/* شريط التقدّم */}
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-bg-alt">
        <i
          className="block h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${(Math.min(step, questions.length) / questions.length) * 100}%` }}
        />
      </div>

      {/* الأسئلة */}
      {!done && (
        <div className="mt-10">
          <h2 className="text-xl font-bold">{questions[step].q}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {questions[step].options.map((o) => (
              <button
                key={o.v}
                onClick={() => answer(o.v)}
                className="rounded-[16px] border border-line bg-card px-5 py-4 text-start text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent active:scale-[0.98]"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* النتيجة */}
      {done && result && (
        <div className="mt-10 space-y-4">
          <div className="flex items-center gap-5 rounded-[22px] border border-line bg-card p-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[16px] bg-bg-alt">
              <BagArt className="h-[78%] text-olive" accent={result.coffee.accent} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">قهوتك المقترحة</p>
              <h3 className="text-2xl font-bold">{result.coffee.name}</h3>
              <p className="mt-1 text-[13px] font-semibold" style={{ color: result.coffee.accent }}>
                {result.coffee.notes.join(" · ")}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                الطحن المقترح: <b className="text-ink">{result.grind}</b>
              </p>
            </div>
            <span className="font-num shrink-0 text-sm font-bold">
              {formatIQD(result.coffee.prices.g250)}
            </span>
          </div>

          {result.tool && (
          <div className="flex items-center gap-5 rounded-[22px] border border-line bg-card p-6">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted">أداة تكمّل تجربتك</p>
              <h3 className="text-xl font-bold">{result.tool.name}</h3>
              <p className="mt-1 truncate text-[12px] text-muted">{result.tool.desc}</p>
            </div>
            <span className="font-num shrink-0 text-sm font-bold">{formatIQD(result.tool.price)}</span>
          </div>
          )}

          <button
            onClick={addBoth}
            className={`btn flex w-full items-center justify-center gap-2 !py-4 text-[15px] transition-colors active:scale-[0.98] ${
              added ? "!bg-ok text-olive-text" : "btn-clay"
            }`}
          >
            {added ? (
              <>
                <Check size={16} /> أُضيفا للسلة
              </>
            ) : (
              result.tool ? "أضفهما للسلة" : "أضفها للسلة"
            )}
          </button>

          <div className="flex justify-center gap-5 pt-2 text-[13px] font-bold">
            <Link href={`/product/?c=${result.coffee.slug}`} className="flex items-center gap-1 text-accent">
              اعرف أكثر عن {result.coffee.name} <ArrowLeft size={14} />
            </Link>
            <button onClick={reset} className="flex items-center gap-1 text-muted hover:text-ink">
              <RotateCcw size={13} /> إعادة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
