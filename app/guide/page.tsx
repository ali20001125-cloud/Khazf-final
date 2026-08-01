"use client";
/** دليل التحضير — الأساسيات التي تسبق أي وصفة: النسبة، الطحن، الماء، الحفظ، الأخطاء */
import Link from "next/link";
import { ArrowLeft, Scale, Thermometer, Timer, Package, AlertCircle } from "lucide-react";
import { useMotion } from "@/lib/motion";
import LeadCapture from "@/components/LeadCapture";

/* النِّسب هنا مطابقة تماماً لحاسبة الوصفات — مصدر واحد للحقيقة */
const RATIOS = [
  { method: "إسبريسو", ratio: "١:٢", example: "١٨غ بن · ٣٦غ ناتج", grind: "ناعم جداً", heat: "٩٣°", time: "٢٥ – ٣٠ ثانية" },
  { method: "V60", ratio: "١:١٥", example: "٢٠غ بن · ٣٠٠مل ماء", grind: "وسط — مثل ملح الطعام", heat: "٩٢°", time: "٢:٤٥ تقريباً" },
  { method: "كيمكس", ratio: "١:١٥", example: "٣٠غ بن · ٤٥٠مل ماء", grind: "وسط-خشن", heat: "٩٣°", time: "٤:٠٠ تقريباً" },
  { method: "أيروبرس", ratio: "١:١٦", example: "١٥غ بن · ٢٤٠مل ماء", grind: "وسط-ناعم", heat: "٩٠°", time: "١:٣٠ – ٢:٠٠" },
];

const MISTAKES = [
  { q: "قهوتي مرّة", a: "الاستخلاص زائد: خشّن الطحن قليلاً، أو أنقص الوقت، أو اخفض حرارة الماء درجتين." },
  { q: "قهوتي حامضة أو مائية", a: "الاستخلاص ناقص: نعّم الطحن، أو أطل الوقت، أو ارفع الحرارة قليلاً." },
  { q: "الطعم يختلف كل مرة", a: "الميزان هو الحل. الملعقة تتفاوت حتى عشرين بالمئة — والقهوة لا تسامح ذلك." },
  { q: "فقدت القهوة نكهتها بسرعة", a: "احفظها في كيسها المغلق بعيداً عن الضوء والحرارة، ولا تطحنها إلا عند التحضير." },
];

export default function GuidePage() {
  const scope = useMotion();

  return (
    <div ref={scope} className="mx-auto max-w-3xl px-4 pb-24 pt-32 md:px-6">
      <p className="reveal font-num text-[10px] tracking-[0.4em] text-accent">BREW GUIDE</p>
      <h1 className="reveal mt-3 text-3xl font-bold leading-tight md:text-4xl">دليل التحضير</h1>
      <p className="reveal mt-3 text-[14px] leading-relaxed text-muted">
        أربع قواعد تسبق أي وصفة. اضبطها مرة، وستتحسّن كل فناجينك بعدها.
      </p>

      {/* القواعد الأربع */}
      <div className="reveal-group mt-10 grid gap-4 sm:grid-cols-2">
        {[
          { Icon: Scale, t: "النسبة قبل كل شيء", d: "نبدأ من ١:١٥ — أي ٢٠ غراماً من البن لكل ٣٠٠ مل ماء، ثم تعدّلها على ذوقك." },
          { Icon: Thermometer, t: "حرارة الماء", d: "بين ٩٠ و٩٣ درجة حسب الطريقة. اترك الماء المغلي دقيقة قبل الصبّ." },
          { Icon: Timer, t: "الوقت", d: "لكل طريقة نافذتها. خارجها تخرج المرارة أو تبقى النكهة حبيسة." },
          { Icon: Package, t: "الطحن عند التحضير", d: "القهوة المطحونة تفقد عطرها خلال دقائق. اطحن ما تشربه فقط." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="rounded-[18px] border border-line bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-olive/10 text-olive">
              <Icon size={19} />
            </div>
            <p className="mt-3 text-[15px] font-bold">{t}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </div>

      {/* جدول النِّسب */}
      <h2 className="reveal mt-14 text-2xl font-bold">النِّسب حسب الطريقة</h2>
      <div className="reveal mt-6 overflow-x-auto rounded-[18px] border border-line bg-card">
        <table className="w-full min-w-[520px]">
          <thead className="border-b border-line">
            <tr className="text-[12px] text-muted">
              <th className="px-4 py-3 text-start font-bold">الطريقة</th>
              <th className="px-4 py-3 text-start font-bold">النسبة</th>
              <th className="px-4 py-3 text-start font-bold">مثال</th>
              <th className="px-4 py-3 text-start font-bold">الطحن</th>
              <th className="px-4 py-3 text-start font-bold">الحرارة</th>
              <th className="px-4 py-3 text-start font-bold">الوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {RATIOS.map((r) => (
              <tr key={r.method}>
                <td className="px-4 py-3.5 text-[13px] font-bold">{r.method}</td>
                <td className="font-num px-4 py-3.5 text-[13px] text-accent">{r.ratio}</td>
                <td className="font-num px-4 py-3.5 text-[12.5px] text-muted">{r.example}</td>
                <td className="px-4 py-3.5 text-[12.5px] text-muted">{r.grind}</td>
                <td className="font-num px-4 py-3.5 text-[12.5px] text-muted">{r.heat}</td>
                <td className="font-num px-4 py-3.5 text-[12.5px] text-muted">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/recipes/"
        className="reveal mt-4 flex items-center justify-center gap-1.5 rounded-[16px] border border-line py-3.5 text-[13px] font-bold text-accent transition-colors hover:border-accent">
        جرّب الوصفة خطوة بخطوة بمؤقّت <ArrowLeft size={14} />
      </Link>

      {/* الأخطاء الشائعة */}
      <h2 className="reveal mt-14 text-2xl font-bold">إذا لم يعجبك الطعم</h2>
      <div className="reveal-group mt-6 space-y-3">
        {MISTAKES.map((m) => (
          <div key={m.q} className="rounded-[18px] border border-line bg-card p-5">
            <p className="flex items-start gap-2 text-[14px] font-bold">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-accent" />
              {m.q}
            </p>
            <p className="mt-2 ps-6 text-[13px] leading-relaxed text-muted">{m.a}</p>
          </div>
        ))}
      </div>

      {/* دعوة */}
      <div className="reveal mt-14 rounded-[22px] border border-clay/25 bg-clay/6 p-6 text-center">
        <p className="text-[16px] font-bold leading-snug">الدليل لا ينفع بلا قهوة تستحقه</p>
        <p className="mt-1.5 text-[13px] text-muted">محاصيل محمّصة بدفعات صغيرة، توصل بابك خلال يوم أو يومين</p>
        <Link href="/products/?cat=coffee"
          className="btn btn-clay mt-4 inline-flex items-center gap-2 !px-7 !py-3 text-[14px]">
          تصفّح المحاصيل <ArrowLeft size={15} />
        </Link>
      </div>

      <div className="reveal mt-8">
        <LeadCapture source="guide" />
      </div>
    </div>
  );
}
