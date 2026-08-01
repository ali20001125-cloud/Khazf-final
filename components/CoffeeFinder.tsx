"use client";
/** «أي محصول يناسبني؟» — ثلاثة أسئلة قصيرة تنتهي بترشيح من محاصيل خزف الفعلية */
import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, RotateCcw } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { formatIQD, type Coffee } from "@/lib/data";
import { useStore } from "@/lib/store";

type Answers = { method?: string; taste?: string; milk?: string };

const QUESTIONS = [
  {
    key: "method" as const,
    q: "شلون تحضّر قهوتك؟",
    opts: [
      { v: "filter", label: "V60 أو فلتر", hint: "تقطير يدوي" },
      { v: "espresso", label: "إسبريسو", hint: "ماكينة ضغط" },
      { v: "other", label: "طريقة ثانية", hint: "فرنش برس · موكا بوت" },
      { v: "unsure", label: "ما أعرف بعد", hint: "رشّح لي الأسهل" },
    ],
  },
  {
    key: "taste" as const,
    q: "أي طعم يجذبك أكثر؟",
    opts: [
      { v: "fruity", label: "فاكهي وحمضي", hint: "توت · حمضيات · أزهار" },
      { v: "choco", label: "شوكولا ومكسّرات", hint: "دافئ وثقيل" },
      { v: "caramel", label: "كراميل وحلاوة", hint: "متوازن وناعم" },
      { v: "any", label: "مفتوح لأي شي", hint: "فاجئني" },
    ],
  },
  {
    key: "milk" as const,
    q: "تشربها مع حليب؟",
    opts: [
      { v: "black", label: "سادة", hint: "بلا حليب" },
      { v: "milk", label: "مع حليب", hint: "لاتيه · كابتشينو" },
      { v: "both", label: "الاثنين", hint: "حسب المزاج" },
    ],
  },
];

/** يرجّح كل محصول حسب الإجابات — يعتمد على نكهاته وقوامه وحموضته الفعلية */
function score(c: Coffee, a: Answers): number {
  let s = 0;
  const notes = (c.notes ?? []).join(" ");
  const acidity = c.flavorAcidity ?? 3;
  const body = c.flavorBody ?? 3;
  const sweet = c.flavorSweetness ?? 3;

  // الطعم المفضّل
  if (a.taste === "fruity") s += acidity * 2 + (/توت|حمضيات|أزهار|فاكه/.test(notes) ? 4 : 0);
  if (a.taste === "choco") s += body * 2 + (/شوكولا|بندق|مكسرات|كاكاو/.test(notes) ? 4 : 0);
  if (a.taste === "caramel") s += sweet * 2 + (/كراميل|حلاوة|عسل/.test(notes) ? 4 : 0);
  if (a.taste === "any") s += sweet + body;

  // طريقة التحضير
  if (a.method === "filter") s += acidity + (/توت|حمضيات|أزهار/.test(notes) ? 2 : 0);
  if (a.method === "espresso") s += body * 1.5 + (/شوكولا|بندق|كراميل/.test(notes) ? 3 : 0);
  if (a.method === "other") s += body;
  if (a.method === "unsure") s += sweet * 1.5;   // الأسهل: الأحلى والأكثر توازناً

  // الحليب يحتاج قواماً يصمد
  if (a.milk === "milk") s += body * 2;
  if (a.milk === "both") s += body;
  if (a.milk === "black") s += acidity;

  if (c.soldOut) s -= 100;
  return s;
}

export default function CoffeeFinder() {
  const { coffees } = useCatalog();
  const { addToCart } = useStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [added, setAdded] = useState(false);

  const pick = (key: keyof Answers, v: string) => {
    setAnswers((p) => ({ ...p, [key]: v }));
    setStep((s) => s + 1);
  };

  const reset = () => { setAnswers({}); setStep(0); setAdded(false); };

  const done = step >= QUESTIONS.length;
  const ranked = done
    ? [...coffees].sort((a, b) => score(b, answers) - score(a, answers))
    : [];
  const best = ranked[0];
  const second = ranked[1];

  if (coffees.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <div className="rounded-[24px] border border-line bg-card p-6 md:p-8">
        {!done ? (
          <>
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={17} />
              <p className="text-[12px] font-bold tracking-wide">أي محصول يناسبني؟</p>
            </div>

            <h2 className="mt-3 text-[22px] font-bold leading-snug md:text-2xl">
              {QUESTIONS[step].q}
            </h2>

            {/* شريط التقدّم */}
            <div className="mt-4 flex gap-1.5">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-clay" : "bg-line"
                }`} />
              ))}
            </div>

            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {QUESTIONS[step].opts.map((o) => (
                <button key={o.v} onClick={() => pick(QUESTIONS[step].key, o.v)}
                  className="rounded-[16px] border border-line bg-bg p-4 text-start transition-all hover:border-clay hover:bg-clay/5 active:scale-[0.98]">
                  <p className="text-[14.5px] font-bold">{o.label}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{o.hint}</p>
                </button>
              ))}
            </div>

            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)}
                className="mt-4 text-[12.5px] font-semibold text-muted">
                رجوع
              </button>
            )}
          </>
        ) : best ? (
          <>
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={17} />
              <p className="text-[12px] font-bold tracking-wide">ترشيحنا لك</p>
            </div>

            <h2 className="mt-3 text-[26px] font-bold md:text-3xl">{best.name}</h2>
            <p className="mt-1 text-[13px] text-muted">{best.country}</p>

            {best.notes?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {best.notes.map((n) => (
                  <span key={n} className="rounded-full bg-bg-alt px-3 py-1 text-[12px] font-bold"
                    style={{ color: best.accent }}>{n}</span>
                ))}
              </div>
            )}

            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
              {answers.taste === "fruity" && "يميل للحموضة المشرقة والنكهات الفاكهية — "}
              {answers.taste === "choco" && "قوامه ثقيل ونكهته دافئة — "}
              {answers.taste === "caramel" && "حلاوته نظيفة ومتوازنة — "}
              {answers.method === "espresso" ? "ويصمد جيداً في الإسبريسو." :
               answers.method === "filter" ? "ويظهر بأفضل صورته على الفلتر." :
               "ويناسب أغلب طرق التحضير."}
              {answers.milk === "milk" && " وقوامه يبقى واضحاً مع الحليب."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="font-num text-2xl font-bold">{formatIQD(best.prices.g250)}</span>
              <button
                disabled={best.soldOut}
                onClick={() => {
                  addToCart({ slug: best.slug, variant: "G250", grind: "حبوب كاملة",
                    name: best.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: best.prices.g250 });
                  setAdded(true);
                  window.setTimeout(() => setAdded(false), 1600);
                }}
                className={`btn !px-6 !py-3 text-[14px] active:scale-[0.98] disabled:opacity-50 ${
                  added ? "!bg-ok text-olive-text" : "btn-clay"
                }`}>
                {best.soldOut ? "نفد مؤقتاً" : added ? "✓ أُضيف للسلة" : "أضفه للسلة"}
              </button>
              <Link href={`/product/?c=${best.slug}`}
                className="flex items-center gap-1.5 text-[13px] font-bold text-accent">
                اقرأ عنه <ArrowLeft size={15} />
              </Link>
            </div>

            {second && !second.soldOut && (
              <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">
                وقريب منه أيضاً:{" "}
                <Link href={`/product/?c=${second.slug}`} className="font-bold text-ink">{second.name}</Link>
              </p>
            )}

            <button onClick={reset}
              className="mt-4 flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
              <RotateCcw size={13} /> جرّب من جديد
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
