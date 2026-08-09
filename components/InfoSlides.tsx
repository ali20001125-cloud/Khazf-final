"use client";
/** شرائح معلوماتية تملأ معرض المنتج — تُبنى بالكود بلا صور */
import type { Coffee } from "@/lib/data";

const OLIVE = "#505445";
const CLAY = "#a66a4c";
const GOLD = "#c9a961";
const CREAM = "#faf7f0";

/** ٢) بطاقة المصدر */
export function SlideOrigin({ coffee }: { coffee: Coffee }) {
  const rows = ([
    ["الدولة", coffee.country],
    ["المنطقة", coffee.region],
    ["الارتفاع", coffee.altitude],
    ["المعالجة", coffee.process],
  ] as [string, string | undefined][]).filter(([, v]) => v) as [string, string][];
  if (rows.length === 0) return null;
  return (
    <div className="flex h-full w-full flex-col justify-center gap-5 px-8" style={{ background: "#f4f2ec", color: "#332b24" }}>
      <p className="font-num text-[10px] tracking-[0.35em] text-muted">ORIGIN</p>
      <div className="flex flex-col gap-3.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5">
            <span className="text-[12.5px] text-muted">{k}</span>
            <span className="text-[15px] font-bold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ٣) رحلة الكوب */
export function SlideJourney({ coffee }: { coffee: Coffee }) {
  const n = coffee.notes ?? [];
  if (n.length < 2) return null;
  const steps = [
    ["في البداية", n[0]],
    ["في الوسط", n[1] ?? n[0]],
    ["والخاتمة", n[2] ?? n[1]],
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 bg-bg px-8">
      <p className="font-num text-[10px] tracking-[0.35em] text-muted">رحلة الفنجان</p>
      <div className="flex flex-wrap gap-2">
        {n.slice(0, 3).map((x) => (
          <span key={x} className="rounded-full bg-bg-alt px-3 py-1.5 text-[12.5px] font-semibold" style={{ color: CLAY }}>{x}</span>
        ))}
      </div>
      <div className="flex flex-col gap-5">
        {steps.map(([when, what], i) => (
          <div key={when} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: i === 2 ? GOLD : CLAY }} />
              {i < 2 && <span className="mt-1 h-8 w-px bg-line" />}
            </div>
            <div className="flex flex-col gap-0.5 pb-1">
              <span className="text-[11.5px] text-muted">{when}</span>
              <span className="text-[17px] font-bold">{what}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ٤) طرق التحضير المناسبة */
export function SlideBrew({ coffee }: { coffee: Coffee }) {
  const methods = coffee.brewMethods?.length
    ? coffee.brewMethods
    : ["إسبريسو", "V60", "كيمكس", "فرنش برس", "لاتيه وكابتشينو", "آيس لاتيه", "كولد برو", "قهوة تركية"];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 px-8" style={{ background: "#eae6dd", color: "#332b24" }}>
      <p className="font-num text-[10px] tracking-[0.35em] text-muted">تناسب</p>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m: string) => (
          <div key={m} className="rounded-[12px] border border-line bg-white/50 px-3 py-3.5 text-center">
            <span className="text-[13px] font-bold">{m}</span>
          </div>
        ))}
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        اختر طحنتك عند الطلب — أو خذها حبوباً كاملة
      </p>
    </div>
  );
}

/** كل الشرائح المتاحة لمحصول */
export function infoSlides(coffee: Coffee) {
  const out: { key: string; el: React.ReactNode }[] = [];
  if (coffee.country || coffee.region) out.push({ key: "origin", el: <SlideOrigin coffee={coffee} /> });
  if ((coffee.notes?.length ?? 0) >= 2) out.push({ key: "journey", el: <SlideJourney coffee={coffee} /> });
  out.push({ key: "brew", el: <SlideBrew coffee={coffee} /> });
  return out;
}
