/** فاتورة قابلة للطباعة — يفتحها الزبون برابط رقم الطلب + هاتفه */
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { formatIQD } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ searchParams }: { searchParams: Promise<{ n?: string; p?: string }> }) {
  const { n, p } = await searchParams;
  const num = (n ?? "").trim().toUpperCase();
  const phone = (p ?? "").trim();
  const [o] = num && phone
    ? await db.select().from(s.orders).where(and(eq(s.orders.orderNumber, num), eq(s.orders.customerPhone, phone)))
    : [];
  if (!o)
    return <div className="mx-auto max-w-md px-6 pt-40 text-center text-sm text-muted">الفاتورة غير موجودة — تأكد من الرابط</div>;
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));
  const rows = [
    { l: "المنتجات", v: formatIQD(o.itemsSubtotal) },
    ...(o.quantityDiscount ? [{ l: "خصم البوكس", v: `− ${formatIQD(o.quantityDiscount)}` }] : []),
    ...(o.couponDiscount ? [{ l: `كود ${o.couponCode}`, v: `− ${formatIQD(o.couponDiscount)}` }] : []),
    ...(o.journeyDiscount ? [{ l: "مكافأة الرحلة", v: `− ${formatIQD(o.journeyDiscount)}` }] : []),
    ...(o.pointsUsed ? [{ l: "رصيد نقاط", v: `− ${formatIQD(o.pointsUsed)}` }] : []),
    { l: "التوصيل", v: o.deliveryCharged ? formatIQD(o.deliveryCharged) : "مجاني" },
  ];
  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-28 print:pt-6">
      <div className="rounded-[22px] border border-line bg-card p-7 print:border-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-bold">خزف</p>
            <p className="font-num mt-0.5 text-[10px] tracking-[0.3em] text-muted">SPECIALTY COFFEE</p>
          </div>
          <div className="text-end">
            <p className="font-num text-lg font-bold">{o.orderNumber}</p>
            <p className="font-num mt-0.5 text-[11px] text-muted">
              {new Date(o.createdAt).toLocaleDateString("ar-IQ", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[14px] bg-bg-alt px-4 py-3 text-[12.5px]">
          <p className="font-bold">{o.name}</p>
          <p className="font-num mt-0.5" dir="ltr">{o.phone}</p>
          <p className="mt-0.5 text-muted">{o.governorate} · {o.address}</p>
        </div>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {items.map((it) => (
            <li key={it.id} className="flex justify-between py-2.5 text-[13px]">
              <span>{it.nameSnapshot}{it.isGift && " 🎁"} <span className="font-num text-muted">×{it.qty}</span></span>
              <span className="font-num font-semibold">{it.isGift ? "هدية" : formatIQD(it.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <ul className="mt-4 space-y-1.5 text-[13px]">
          {rows.map((r) => (
            <li key={r.l} className="flex justify-between"><span className="text-muted">{r.l}</span><span className="font-num">{r.v}</span></li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t-2 border-ink pt-3 text-[15px] font-bold">
          <span>الإجمالي — كاش عند الاستلام</span>
          <span className="font-num">{formatIQD(o.total)}</span>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted">شكراً لاختيارك خزف ☕ خزف — قهوة مختصة، توصيل لكل العراق</p>
      </div>
      <PrintBtn />
    </div>
  );
}

function PrintBtn() {
  return (
    <form className="mt-4 text-center print:hidden">
      <button formAction={async () => { "use server"; }} className="hidden" />
      <a href="javascript:window.print()" className="btn btn-olive inline-block !px-8 !py-3 text-sm">🖨️ اطبع / احفظ PDF</a>
    </form>
  );
}
