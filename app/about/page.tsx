"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMotion } from "@/lib/motion";

const values = [
  { t: "ننتقي، لا نزرع", d: "خزف مو مزرعة — إحنا نختار. نتذوّق محاصيل من أفضل مناطق العالم (إثيوبيا، البرازيل، كولومبيا) ونوقف عند اللي يستاهل يوصلك. شغلنا هو الاختيار الصعب حتى يصير كوبك سهل." },
  { t: "نحمّص باستمرار", d: "ما نخزّن أكياساً تنتظر شهوراً على الرف. نحمّص بدفعات متقاربة، حتى اللي يوصلك يكون قريباً من تاريخ تحميصه — وتلقى التاريخ مطبوعاً على الكيس نفسه." },
  { t: "الوضوح قبل التسويق", d: "نكتب الأصل والمعالجة والإيحاءات بصدق، بلا مبالغة. تعرف بالضبط شنو تشرب ومن وين جا — لأن القهوة المختصة تبدأ بالمعرفة." },
  { t: "من الكيس لباب بيتك", d: "نغلّف بعناية ونوصل لكل محافظات العراق خلال يوم إلى يومين. تجربة بسيطة وسريعة — تطلب، ونوصلك، وتستمتع." },
];

export default function AboutPage() {
  const scope = useMotion();
  return (
    <div ref={scope} className="mx-auto max-w-3xl px-5 pb-24 pt-32 md:px-8">
      <p className="reveal font-num text-[11px] font-bold tracking-[0.3em] text-accent">قصتنا</p>
      <h1 className="reveal mt-4 text-4xl font-bold leading-[1.25] md:text-5xl">
        قهوة مختارة بعناية،
        <br />
        <span className="text-accent">لمن يعرف قيمة الكوب الجيّد</span>
      </h1>
      <p className="reveal mt-6 text-[15px] leading-loose text-muted md:text-[16px]">
        بدأت خزف بسؤال بسيط: ليش نكتفي بقهوة عادية وإحنا نقدر نوصل الأفضل؟ إحنا مو مزرعة ولا وسيط —
        إحنا مُنتقون ومحمّصون، مهمتنا نختصر لك المسافة بين أجود محاصيل العالم وفنجانك في العراق.
      </p>
      <div className="mt-14 space-y-10">
        {values.map((v, i) => (
          <div key={v.t} className="reveal flex gap-5">
            <span className="font-num shrink-0 text-2xl font-bold text-line">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-xl font-bold">{v.t}</h2>
              <p className="mt-2 text-[14.5px] leading-loose text-muted">{v.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="reveal mt-16 rounded-[24px] bg-olive p-8 text-center text-olive-text md:p-10">
        <p className="text-xl font-bold md:text-2xl">جرّب الفرق بنفسك</p>
        <p className="mt-2 text-[14px] opacity-85">ابدأ بمحصول واحد، أو ابنِ بوكسك ووفّر</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/products/?cat=coffee" className="rounded-full bg-gold px-6 py-3 text-[14px] font-bold text-olive">تسوّق القهوة</Link>
          <Link href="/box/" className="flex items-center gap-1.5 rounded-full border border-olive-text/25 px-6 py-3 text-[14px] font-bold">ابنِ بوكسك <ArrowLeft size={15} /></Link>
        </div>
      </div>
    </div>
  );
}
