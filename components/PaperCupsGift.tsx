"use client";
/** شارة الأكواب الورقية المجانية — تظهر في مواضع القرار */
export default function PaperCupsGift({ variant = "line" }: { variant?: "line" | "card" | "dark" }) {
  const text = "أكواب ورقية هدية مع طلبك";

  if (variant === "line") {
    return (
      <p className="flex items-center gap-2 text-[12px] font-semibold text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        {text}
      </p>
    );
  }

  if (variant === "dark") {
    return (
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-gold">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        {text}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 border border-ok/30 bg-ok/8 px-4 py-3" style={{ borderRadius: 4 }}>
      <span className="h-2 w-2 shrink-0 rounded-full bg-ok" />
      <p className="text-[12.5px] font-semibold text-ok">{text}</p>
    </div>
  );
}
