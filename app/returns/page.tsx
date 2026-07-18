import { ShieldCheck, RefreshCcw, MessageCircle } from "lucide-react";

export const metadata = { title: "سياسة الاسترجاع — خزف" };

export default function ReturnsPage() {
  const rows = [
    { Icon: ShieldCheck, t: "ضمان الوصول", d: "وصلك الكيس متضرراً أو ناقصاً أو خطأ بالطلب؟ نبدّله فوراً بلا أي كلفة عليك." },
    { Icon: RefreshCcw, t: "مدة الطلب", d: "بلّغنا خلال ٤٨ ساعة من الاستلام مع صورة للمشكلة، ونرتّب الاستبدال بأقرب شحنة." },
    { Icon: MessageCircle, t: "شلون تتواصل", d: "عبر صفحة تواصل معنا أو رسالة انستغرام @khazf.roaster — نرد خلال ساعات العمل." },
  ];
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="text-3xl font-bold md:text-4xl">سياسة الاسترجاع</h1>
      <p className="mt-3 text-[14px] leading-loose text-muted">
        القهوة منتج طازج، لذلك لا نستقبل إرجاع الأكياس المفتوحة — لكن رضاك مضمون بالحالات التالية:
      </p>
      <div className="mt-8 space-y-4">
        {rows.map((r) => (
          <div key={r.t} className="flex gap-4 rounded-[18px] border border-line bg-card p-5">
            <r.Icon size={20} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <h2 className="font-bold">{r.t}</h2>
              <p className="mt-1.5 text-[13px] leading-loose text-muted">{r.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
