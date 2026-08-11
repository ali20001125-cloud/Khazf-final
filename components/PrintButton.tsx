"use client";
/** زر طباعة الفاتورة — بديل نظيف عن href="javascript:" (يعمل مع CSP صارم) */
export default function PrintButton() {
  return (
    <div className="mt-4 text-center print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn btn-olive inline-block !px-8 !py-3 text-sm"
      >
        اطبع / احفظ PDF
      </button>
    </div>
  );
}
