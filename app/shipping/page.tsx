import { Truck, Clock, HandCoins, PackageCheck } from "lucide-react";

export const metadata = { title: "سياسة الشحن — خزف" };

export default function ShippingPage() {
  const rows = [
    { Icon: Truck, t: "التغطية", d: "نوصّل لكل محافظات العراق الـ ١٨ عبر شركات توصيل موثوقة — التوصيل مجاني على كل الطلبات." },
    { Icon: Clock, t: "المدة", d: "بغداد: ١–٢ يوم عمل. باقي المحافظات: ٢–٤ أيام عمل. نتصل بيك لتأكيد الطلب قبل الشحن." },
    { Icon: HandCoins, t: "الدفع", d: "كاش عند الاستلام — تفحص طلبك بيدك قبل ما تدفع." },
    { Icon: PackageCheck, t: "التغليف", d: "أكياس بصمام أحادي الاتجاه داخل تغليف مقوّى — قهوتك توصل طازجة وسليمة." },
  ];
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="text-3xl font-bold md:text-4xl">سياسة الشحن</h1>
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
