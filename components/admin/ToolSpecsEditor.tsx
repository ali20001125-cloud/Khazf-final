"use client";
/**
 * محرّر تفاصيل الأداة (toolSpecs) — قوائم ديناميكية:
 * البطل · الميزات · المواصفات · الأجزاء المشروحة · النقاط التفاعلية ·
 * المقاسات · الألوان (كل لون بصورته) · التوافق · محتويات العبوة.
 * يخزّن الناتج JSON في input مخفي باسم tool_specs ليُرسل مع النموذج.
 */
import { useState } from "react";
import type { ToolSpecs, ToolColor, ToolFeature, ToolSpec, ToolPart, ToolSize } from "@/lib/tool-specs";
import SingleImageInline from "@/components/admin/SingleImageInline";

const inp = "w-full rounded-[12px] border border-line bg-bg px-3 py-2.5 text-[13px] outline-none focus:border-accent";
const btnAdd = "rounded-[10px] border border-dashed border-accent/50 px-3 py-2 text-[12px] font-bold text-accent hover:bg-accent/5";
const btnDel = "shrink-0 rounded-[8px] bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent";
const secTitle = "text-[13px] font-bold text-ink";
const secHint = "mb-3 text-[11px] text-muted";

export default function ToolSpecsEditor({ initial }: { initial?: ToolSpecs | null }) {
  const [hero, setHero] = useState(initial?.hero ?? "");
  const [features, setFeatures] = useState<ToolFeature[]>(initial?.features ?? []);
  const [specs, setSpecs] = useState<ToolSpec[]>(initial?.specs ?? []);
  const [parts, setParts] = useState<ToolPart[]>(initial?.parts ?? []);
  const [sizes, setSizes] = useState<ToolSize[]>(initial?.sizes ?? []);
  const [colors, setColors] = useState<ToolColor[]>(initial?.colors ?? []);
  const [compat, setCompat] = useState<string[]>(initial?.compat ?? []);
  const [boxContents, setBoxContents] = useState<string[]>(initial?.boxContents ?? []);

  const specs_json: ToolSpecs = { hero, features, specs, parts, sizes, colors, compat, boxContents };

  return (
    <div className="space-y-6">
      <input type="hidden" name="tool_specs" value={JSON.stringify(specs_json)} />

      {/* البطل */}
      <div>
        <p className={secTitle}>جملة البطل</p>
        <p className={secHint}>الجملة الفارقة التي تظهر أعلى الصفحة — لماذا هذه الأداة مميّزة</p>
        <input value={hero} onChange={(e) => setHero(e.target.value)} className={inp} placeholder="قمع يجمع طريقتين — تقطير ونقع في أداة واحدة" />
      </div>

      {/* الميزات */}
      <ListEditor
        title="الميزات — لماذا هذه الأداة" hint="نقاط سردية تشرح الفائدة (٢–٤ ميزات)"
        items={features} setItems={setFeatures}
        empty={{ icon: "", title: "", desc: "" }}
        render={(it, set) => (
          <div className="flex-1 space-y-2">
            <input value={it.title} onChange={(e) => set({ ...it, title: e.target.value })} className={inp} placeholder="العنوان — مثل: صمّام تحكّم ذكي" />
            <input value={it.desc} onChange={(e) => set({ ...it, desc: e.target.value })} className={inp} placeholder="الشرح — مثل: انقع القهوة ثم افتح الصمّام بضغطة" />
          </div>
        )}
      />

      {/* المواصفات */}
      <ListEditor
        title="المواصفات" hint="مادة، سعة، أبعاد... (مفتاح وقيمة)"
        items={specs} setItems={setSpecs}
        empty={{ key: "", value: "" }}
        render={(it, set) => (
          <div className="flex flex-1 gap-2">
            <input value={it.key} onChange={(e) => set({ ...it, key: e.target.value })} className={`${inp} w-1/3`} placeholder="المادة" />
            <input value={it.value} onChange={(e) => set({ ...it, value: e.target.value })} className={`${inp} flex-1`} placeholder="زجاج بوروسيليكات" />
          </div>
        )}
      />

      {/* الأجزاء المشروحة */}
      <ListEditor
        title="الأجزاء المشروحة" hint="صورة قريبة لجزء + شرحه (اختياري — للأدوات الغنية بالتفاصيل)"
        items={parts} setItems={setParts}
        empty={{ image: "", tag: "", title: "", desc: "" }}
        render={(it, set) => (
          <div className="flex-1 space-y-2">
            <input value={it.tag ?? ""} onChange={(e) => set({ ...it, tag: e.target.value })} className={inp} placeholder="الوسم — مثل: الفوهة الحلزونية" />
            <input value={it.title} onChange={(e) => set({ ...it, title: e.target.value })} className={inp} placeholder="العنوان — مثل: تدفّق موجّه" />
            <input value={it.desc} onChange={(e) => set({ ...it, desc: e.target.value })} className={inp} placeholder="الشرح" />
            <SingleImageInline label="صورة الجزء (اختياري)" value={it.image ?? ""} onChange={(url) => set({ ...it, image: url })} />
          </div>
        )}
      />

      {/* المقاسات */}
      <ListEditor
        title="المقاسات" hint="للفلاتر والأقماع (٠١ · ٠٢...)"
        items={sizes} setItems={setSizes}
        empty={{ label: "", sub: "" }}
        render={(it, set) => (
          <div className="flex flex-1 gap-2">
            <input value={it.label} onChange={(e) => set({ ...it, label: e.target.value })} className={`${inp} w-1/3`} placeholder="٠١" />
            <input value={it.sub ?? ""} onChange={(e) => set({ ...it, sub: e.target.value })} className={`${inp} flex-1`} placeholder="١–٢ أكواب" />
          </div>
        )}
      />

      {/* الألوان — كل لون بصورته */}
      <ListEditor
        title="الألوان" hint="كل لون باسمه ودرجته وصورته — عند اختيار اللون تظهر صورته"
        items={colors} setItems={setColors}
        empty={{ name: "", hex: "#cccccc", image: "" }}
        render={(it, set) => (
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <input value={it.name} onChange={(e) => set({ ...it, name: e.target.value })} className={`${inp} flex-1`} placeholder="اسم اللون — أزرق" />
              <input type="color" value={it.hex} onChange={(e) => set({ ...it, hex: e.target.value })} className="h-[42px] w-12 cursor-pointer rounded-[10px] border border-line" />
            </div>
            <SingleImageInline label="صورة المنتج بهذا اللون" value={it.image ?? ""} onChange={(url) => set({ ...it, image: url })} />
          </div>
        )}
      />

      {/* التوافق */}
      <StringListEditor title="يعمل مع" hint="التوافق — سطر لكل بند" items={compat} setItems={setCompat} placeholder="فلاتر V60 الورقية مقاس ٠٢" />

      {/* محتويات العبوة */}
      <StringListEditor title="محتويات العبوة" hint="ما يجده الزبون داخل العلبة" items={boxContents} setItems={setBoxContents} placeholder="قمع زجاجي" />
    </div>
  );
}

/* ── محرّر قائمة عناصر (كائنات) ── */
function ListEditor<T>({ title, hint, items, setItems, empty, render }: {
  title: string; hint: string; items: T[]; setItems: (v: T[]) => void;
  empty: T; render: (it: T, set: (v: T) => void) => React.ReactNode;
}) {
  return (
    <div>
      <p className={secTitle}>{title}</p>
      <p className={secHint}>{hint}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2 rounded-[12px] border border-line bg-card p-2.5">
            {render(it, (v) => setItems(items.map((x, j) => (j === i ? v : x))))}
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className={btnDel}>حذف</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, { ...empty }])} className={btnAdd}>+ إضافة</button>
      </div>
    </div>
  );
}

/* ── محرّر قائمة نصوص بسيطة ── */
function StringListEditor({ title, hint, items, setItems, placeholder }: {
  title: string; hint: string; items: string[]; setItems: (v: string[]) => void; placeholder: string;
}) {
  return (
    <div>
      <p className={secTitle}>{title}</p>
      <p className={secHint}>{hint}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={it} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} className={inp} placeholder={placeholder} />
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className={btnDel}>حذف</button>
          </div>
        ))}
        <button type="button" onClick={() => setItems([...items, ""])} className={btnAdd}>+ إضافة</button>
      </div>
    </div>
  );
}
