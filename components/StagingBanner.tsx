"use client";
/** لافتة بيئة الاختبار — تظهر فقط حين NEXT_PUBLIC_ENV=staging */
export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_ENV !== "staging") return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[200] bg-[#b4472f] py-1 text-center text-[11px] font-bold text-white">
      بيئة اختبار — البيانات هنا لا تُحتسب
    </div>
  );
}
