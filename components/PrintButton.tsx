"use client";
/** زر طباعة/حفظ PDF — يعمل مع CSP صارم. label وclassName اختياريان. */
export default function PrintButton({ label = "اطبع / احفظ PDF", className }: { label?: string; className?: string }) {
  if (className) {
    return <button type="button" onClick={() => window.print()} className={className}>{label}</button>;
  }
  return (
    <div className="mt-4 text-center print:hidden">
      <button type="button" onClick={() => window.print()} className="btn btn-olive inline-block !px-8 !py-3 text-sm">
        {label}
      </button>
    </div>
  );
}
