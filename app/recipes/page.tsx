"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Play, Pause, RotateCcw, Check, ArrowLeft } from "lucide-react";
import { useMotion } from "@/lib/motion";

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

interface Step {
  label: string;
  at: number;
}
interface Recipe {
  stats: { l: string; v: string }[];
  total: number;
  steps: Step[];
  grind: string;
}
interface Method {
  key: string;
  name: string;
  latin: string;
  doseMin: number;
  doseMax: number;
  doseDefault: number;
  build: (dose: number) => Recipe;
}

/* ─── كل طريقة تبني وصفتها من كمية البن فقط ─── */
const methods: Method[] = [
  {
    key: "espresso", name: "إسبريسو", latin: "ESPRESSO",
    doseMin: 14, doseMax: 22, doseDefault: 18,
    build: (d) => ({
      grind: "ناعم جداً",
      total: 30,
      stats: [
        { l: "Ratio", v: "1:2" },
        { l: "البن", v: `${d}غ` },
        { l: "الناتج", v: `${d * 2}غ` },
        { l: "الوقت", v: "25–30 ث" },
        { l: "الحرارة", v: "93°" },
      ],
      steps: [
        { label: "ابدأ الاستخلاص — أول قطرات بعد ~٧ ثواني", at: 0 },
        { label: "تدفّق ذهبي ثابت — راقب الوزن", at: 9 },
        { label: `أوقف عند ${d * 2}غ (النافذة 25–30ث)`, at: 25 },
      ],
    }),
  },
  {
    key: "v60", name: "V60", latin: "V60",
    doseMin: 12, doseMax: 30, doseDefault: 20,
    build: (d) => {
      const water = Math.round((d * 15) / 5) * 5;
      const bloom = d * 2;
      const total = Math.round((135 + d * 1.5) / 5) * 5;
      const p1 = Math.round(water * 0.4 / 5) * 5;
      const p2 = Math.round(water * 0.7 / 5) * 5;
      return {
        grind: "وسط — مثل ملح الطعام",
        total,
        stats: [
          { l: "الماء", v: `${water}مل` },
          { l: "الحرارة", v: "92°" },
          { l: "Bloom", v: `${bloom}مل · 30ث` },
          { l: "عدد الصبّات", v: "4" },
          { l: "الوقت الكلي", v: fmt(total) },
        ],
        steps: [
          { label: `Bloom — اسكب ${bloom}مل ودوّر بلطف`, at: 0 },
          { label: `الصبّة الأولى — حتى ${p1}مل`, at: 30 },
          { label: `الثانية — حتى ${p2}مل`, at: 70 },
          { label: `الأخيرة — حتى ${water}مل`, at: 110 },
          { label: "خلّي التصفية تكتمل ثم ارفع القمع", at: total - 25 },
        ],
      };
    },
  },
  {
    key: "chemex", name: "كيمكس", latin: "CHEMEX",
    doseMin: 20, doseMax: 45, doseDefault: 30,
    build: (d) => {
      const water = Math.round((d * 15) / 10) * 10;
      const bloom = d * 2;
      const total = Math.round((170 + d * 2.5) / 5) * 5;
      return {
        grind: "وسط-خشن",
        total,
        stats: [
          { l: "الماء", v: `${water}مل` },
          { l: "الحرارة", v: "93°" },
          { l: "Bloom", v: `${bloom}مل · 45ث` },
          { l: "عدد الصبّات", v: "3" },
          { l: "الوقت الكلي", v: fmt(total) },
        ],
        steps: [
          { label: `Bloom — اسكب ${bloom}مل ودوّر`, at: 0 },
          { label: `الصبّة الأولى — حتى ${Math.round(water * 0.5 / 10) * 10}مل`, at: 45 },
          { label: `الأخيرة — حتى ${water}مل`, at: 110 },
          { label: "انتظر اكتمال التصفية", at: total - 40 },
        ],
      };
    },
  },
  {
    key: "aero", name: "أيروبرس", latin: "AEROPRESS",
    doseMin: 11, doseMax: 18, doseDefault: 14,
    build: (d) => {
      const water = Math.round((d * 15.7) / 5) * 5;
      return {
        grind: "وسط-ناعم",
        total: 100,
        stats: [
          { l: "الماء", v: `${water}مل` },
          { l: "الحرارة", v: "90°" },
          { l: "التحريك", v: "10ث" },
          { l: "الكبس", v: "~25ث" },
          { l: "الوقت الكلي", v: "01:40" },
        ],
        steps: [
          { label: `اسكب ${water}مل على ${d}غ وحرّك 10ث`, at: 0 },
          { label: "ركّب المكبس وانتظر", at: 20 },
          { label: "اكبس ببطء وثبات حتى الهسّة", at: 70 },
        ],
      };
    },
  },
  {
    key: "french", name: "فرنش برس", latin: "FRENCH PRESS",
    doseMin: 15, doseMax: 40, doseDefault: 20,
    build: (d) => {
      const water = Math.round((d * 15) / 10) * 10;
      return {
        grind: "خشن — مثل فتات الخبز",
        total: 240,
        stats: [
          { l: "الماء", v: `${water}مل` },
          { l: "الحرارة", v: "93°" },
          { l: "النقع", v: "4 دقائق" },
          { l: "التحريك", v: "مرة وحدة" },
          { l: "الوقت الكلي", v: "04:00" },
        ],
        steps: [
          { label: `اسكب ${water}مل كاملة وحرّك مرة`, at: 0 },
          { label: "غطِّ بدون كبس واصبر", at: 20 },
          { label: "اكبس ببطء… واسكب فوراً", at: 220 },
        ],
      };
    },
  },
];

/* ════════ المؤقت ════════ */
function Timer({ recipe, onBack, methodName }: { recipe: Recipe; onBack: () => void; methodName: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const startAt = useRef(0);
  const isEsp = methodName === "إسبريسو";

  useEffect(() => {
    if (!running) return;
    startAt.current = performance.now() - elapsed * 1000;
    const tick = (t: number) => {
      const e = (t - startAt.current) / 1000;
      if (e >= recipe.total) {
        setElapsed(recipe.total);
        setRunning(false);
        return;
      }
      setElapsed(e);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, recipe.total]);

  const active = recipe.steps.reduce((a, s, i) => (elapsed >= s.at ? i : a), 0);
  const done = elapsed >= recipe.total;
  const inWindow = isEsp && elapsed >= 25 && elapsed <= 30;

  return (
    <div className="rounded-[24px] border border-line bg-card p-6 md:p-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-ink">
        <ArrowLeft size={14} className="rotate-180" /> رجوع للوصفة
      </button>

      <div className="mt-5 text-center">
        <span
          className={`font-num text-7xl font-semibold tabular-nums transition-colors md:text-8xl ${
            done || inWindow ? "text-ok" : "text-ink"
          }`}
          dir="ltr"
        >
          {fmt(elapsed)}
        </span>
        <p className="font-num mt-1 text-[12px] text-muted" dir="ltr">/ {fmt(recipe.total)}</p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-bg-alt">
        <i
          className="block h-full rounded-full bg-accent transition-[width] duration-150"
          style={{ width: `${Math.min(elapsed / recipe.total, 1) * 100}%` }}
        />
      </div>

      <ol className="mt-6 space-y-2.5">
        {recipe.steps.map((s, i) => {
          const passed = elapsed > (recipe.steps[i + 1]?.at ?? recipe.total);
          const on = i === active && !done;
          return (
            <li
              key={s.at}
              className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 transition-all duration-300 ${
                on ? "scale-[1.01] border-accent bg-accent/8" : passed || done ? "border-line bg-bg-alt opacity-60" : "border-line bg-bg"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  passed || done ? "bg-ok text-olive-text" : on ? "bg-accent text-olive-text" : "bg-bg-alt text-muted"
                }`}
              >
                {passed || done ? <Check size={13} /> : i + 1}
              </span>
              <span className={`flex-1 text-[14px] ${on ? "font-bold" : "font-medium"}`}>{s.label}</span>
              <span className="font-num text-[12px] text-muted" dir="ltr">{fmt(s.at)}</span>
            </li>
          );
        })}
      </ol>

      {done && (
        <p className="mt-5 rounded-[14px] bg-ok/10 py-3 text-center text-sm font-bold text-ok">صحّتين! فنجانك جاهز</p>
      )}

      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={() => setRunning(!running)}
          disabled={done}
          className="btn btn-clay flex items-center gap-2 !px-8 !py-3.5 text-sm active:scale-[0.97] disabled:opacity-40"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "إيقاف" : elapsed > 0 ? "متابعة" : "ابدأ"}
        </button>
        <button
          onClick={() => { setRunning(false); setElapsed(0); }}
          className="btn btn-ghost flex items-center gap-2 !px-6 !py-3.5 text-sm active:scale-[0.97]"
        >
          <RotateCcw size={15} /> إعادة
        </button>
      </div>
    </div>
  );
}

/* ════════ الصفحة ════════ */
export default function RecipesPage() {
  const scope = useMotion();
  const [mKey, setMKey] = useState("v60");
  const method = methods.find((m) => m.key === mKey)!;
  const [dose, setDose] = useState(method.doseDefault);
  const [brewing, setBrewing] = useState(false);

  /* عند تغيير الطريقة نرجّع الجرعة الافتراضية */
  const switchMethod = (k: string) => {
    const m = methods.find((x) => x.key === k)!;
    setMKey(k);
    setDose(m.doseDefault);
    setBrewing(false);
  };

  const recipe = useMemo(() => method.build(dose), [method, dose]);

  return (
    <div ref={scope} className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <p className="reveal font-num text-[10px] tracking-[0.4em] text-muted">BREW GUIDE</p>
      <h1 className="reveal mt-3 text-3xl font-bold md:text-4xl">الوصفات</h1>
      <p className="reveal mt-2 text-[14px] leading-loose text-muted">
        اختر طريقتك، حرّك كمية البن… وكل الأرقام تتعدّل وحدها.
      </p>

      {brewing ? (
        <div className="mt-8">
          <Timer recipe={recipe} onBack={() => setBrewing(false)} methodName={method.name} />
        </div>
      ) : (
        <>
          {/* ١) الطريقة */}
          <p className="mt-9 text-sm font-bold text-muted">طريقة التحضير</p>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => switchMethod(m.key)}
                className={`shrink-0 rounded-[14px] border px-5 py-3 text-sm font-bold transition-all duration-200 active:scale-[0.96] ${
                  mKey === m.key ? "border-olive bg-olive text-olive-text" : "border-line bg-card hover:border-muted"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          {/* ٢) كمية البن */}
          <div className="mt-8 rounded-[22px] border border-line bg-card p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-muted">كمية البن</p>
              <p className="font-num text-3xl font-bold">
                {dose}<span className="text-base text-muted">غ</span>
              </p>
            </div>
            <input
              type="range"
              min={method.doseMin}
              max={method.doseMax}
              value={dose}
              onChange={(e) => setDose(Number(e.target.value))}
              className="dose-slider mt-5 w-full"
              dir="ltr"
              aria-label="كمية البن"
            />
            <div className="font-num mt-1.5 flex justify-between text-[11px] text-muted" dir="ltr">
              <span>{method.doseMin}g</span>
              <span>{method.doseMax}g</span>
            </div>
          </div>

          {/* ٣) الأرقام — تتحدّث حياً */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {recipe.stats.map((x) => (
              <div key={x.l} className="rounded-[16px] border border-line bg-card py-4 text-center transition-colors">
                <p className="text-[11px] text-muted">{x.l}</p>
                <p className="font-num mt-1 text-[15px] font-bold">{x.v}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-muted">الطحن: {recipe.grind}</p>

          {/* ٤) ابدأ */}
          <button
            onClick={() => setBrewing(true)}
            className="btn btn-clay mt-6 flex w-full items-center justify-center gap-2 !py-4 text-[15px] active:scale-[0.98]"
          >
            <Play size={16} /> ابدأ التحضير
          </button>

          <Link
            href="/journal/"
            className="mt-8 flex items-center justify-center gap-1.5 rounded-[16px] border border-line py-3.5 text-[13px] font-bold text-muted transition-colors hover:border-accent hover:text-accent"
          >
            تريد تفهم أعمق؟ دليل الطحن والأدوات بالمدونة <ArrowLeft size={14} />
          </Link>
        </>
      )}
    </div>
  );
}
