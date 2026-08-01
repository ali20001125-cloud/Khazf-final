"use client";
/** شريط تتبّع الطلب — مراحل تلقائية محسوبة من وقت التأكيد */
import { Check } from "lucide-react";

type Props = { createdAt: string; status: string; deliveredAt?: string | null };

const HOURS = { prep: 5, shipped: 24, delivered: 72 };

export default function OrderTimeline({ createdAt, status, deliveredAt }: Props) {
  if (status === "CANCELLED") {
    return <p className="mt-3 rounded-[10px] bg-accent/8 px-3 py-2 text-[12px] font-bold text-accent">أُلغي الطلب</p>;
  }

  const start = new Date(createdAt).getTime();
  const hoursPassed = (Date.now() - start) / 36e5;
  const isDelivered = status === "DELIVERED";

  const steps = [
    { label: "تأكيد الطلب", done: true },
    { label: "قيد التجهيز", done: isDelivered || hoursPassed >= HOURS.prep },
    { label: "مع المندوب", done: isDelivered || hoursPassed >= HOURS.shipped },
    { label: "تم التوصيل", done: isDelivered },
  ];
  const lastDone = steps.reduce((acc, st, i) => (st.done ? i : acc), 0);

  return (
    <div className="mt-3.5 border-t border-line pt-3.5">
      <div className="flex items-start">
        {steps.map((st, i) => {
          const active = i <= lastDone;
          return (
            <div key={st.label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div className={`h-0.5 flex-1 ${i === 0 ? "bg-transparent" : active ? "bg-clay" : "bg-line"}`} />
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  active ? "border-clay bg-clay" : "border-line bg-card"
                }`}>
                  {active && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <div className={`h-0.5 flex-1 ${i === steps.length - 1 ? "bg-transparent" : i < lastDone ? "bg-clay" : "bg-line"}`} />
              </div>
              <span className={`mt-1.5 text-center text-[10.5px] leading-tight ${
                active ? "font-bold text-ink" : "text-muted"
              }`}>
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
      {!isDelivered && (
        <p className="mt-2.5 text-center text-[11px] text-muted">
          {hoursPassed < HOURS.prep ? "نجهّز طلبك الآن"
            : hoursPassed < HOURS.shipped ? "طلبك جاهز وبانتظار المندوب"
            : "طلبك في الطريق إليك"}
        </p>
      )}
    </div>
  );
}
