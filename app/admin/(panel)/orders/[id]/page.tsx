import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, StatusBadge, money, dateAr, SubmitBtn } from "@/components/admin/ui";
import { deliverAction, cancelAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o] = await db.select().from(s.orders).where(eq(s.orders.id, Number(id)));
  if (!o) notFound();
  const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id));

  const rows: { l: string; v: string; cls?: string }[] = [
    { l: "المنتجات (بعد خصم الكمية)", v: money(o.itemsSubtotal) },
    ...(o.quantityDiscount ? [{ l: "خصم البوكس", v: `−${money(o.quantityDiscount)}`, cls: "text-ok" }] : []),
    ...(o.couponDiscount ? [{ l: `كود ${o.couponCode}`, v: `−${money(o.couponDiscount)}`, cls: "text-ok" }] : []),
    ...(o.journeyDiscount ? [{ l: "مكافأة الرحلة", v: `−${money(o.journeyDiscount)}`, cls: "text-ok" }] : []),
    ...(o.pointsUsed ? [{ l: "نقاط مستخدمة", v: `−${money(o.pointsUsed)}`, cls: "text-gold" }] : []),
    { l: "توصيل (الزبون)", v: o.deliveryCharged ? money(o.deliveryCharged) : "مجاني" },
    { l: "الإجمالي قبل التقريب", v: money(o.totalRaw), cls: "text-muted" },
    { l: "الإجمالي النهائي", v: money(o.total), cls: "text-lg font-bold" },
  ];
  const internal = [
    { l: "تكلفة التوصيل (الشركة)", v: money(o.deliveryCost) },
    { l: "صافي التوصيل", v: money(o.deliveryNet), cls: o.deliveryNet >= 0 ? "text-ok" : "text-accent" },
    { l: "ربح المنتجات (FIFO)", v: money(o.productProfit), cls: o.productProfit >= 0 ? "text-ok" : "text-accent" },
    { l: "الربح الكلي", v: money(o.productProfit + o.deliveryNet), cls: "font-bold " + (o.productProfit + o.deliveryNet >= 0 ? "text-ok" : "text-accent") },
    { l: "نقاط سيكسبها", v: `${o.pointsEarned} نقطة` },
    { l: "إشعار تلغرام", v: o.notifiedTelegram ? "أُرسل ✓" : "لم يُرسل" },
  ];

  return (
    <div>
      <PageTitle
        title={o.orderNumber}
        sub={dateAr(o.createdAt)}
        action={<StatusBadge status={o.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">الأسطر</h2>
            <ul className="divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between py-3 text-[13.5px]">
                  <span>
                    {it.nameSnapshot}
                    {it.isGift && <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">هدية</span>}
                    {it.boxGroup != null && <span className="ms-2 rounded-full bg-olive/10 px-2 py-0.5 text-[10px] font-bold">بوكس</span>}
                    <span className="font-num ms-2 text-[11px] text-muted">×{it.qty}{it.gramsTotal ? ` · ${it.gramsTotal}غ` : ""}</span>
                  </span>
                  <span className="font-num font-semibold">{money(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">الحساب (ما يراه الزبون)</h2>
            <ul className="space-y-2">
              {rows.map((r) => (
                <li key={r.l} className={`flex justify-between text-[13.5px] ${r.cls ?? ""}`}>
                  <span>{r.l}</span><span className="font-num">{r.v}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">داخلي (لا يراه الزبون)</h2>
            <ul className="space-y-2">
              {internal.map((r) => (
                <li key={r.l} className={`flex justify-between text-[13.5px] ${r.cls ?? ""}`}>
                  <span>{r.l}</span><span className="font-num">{r.v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">الزبون والتوصيل</h2>
            <p className="font-bold">{o.name}</p>
            <p className="font-num mt-1 text-[13px]" dir="ltr">{o.phone}</p>
            {o.email && <p className="font-num mt-0.5 text-[12px] text-muted" dir="ltr">{o.email}</p>}
            <p className="mt-3 text-[13px] leading-relaxed text-muted">{o.governorate} · {o.address}</p>
            {o.note && <p className="mt-3 rounded-[10px] bg-bg-alt px-3.5 py-2.5 text-[12.5px]">📝 {o.note}</p>}
            <Link href={`/admin/customers/${o.customerPhone}/`} className="mt-4 inline-block text-[12.5px] font-bold text-accent">
              ملف الزبون الكامل ←
            </Link>
          </Card>

          {o.status === "CONFIRMED" && (
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-bold text-muted">إجراءات</h2>
              <form action={deliverAction}>
                <input type="hidden" name="id" value={o.id} />
                <SubmitBtn>تم التوصيل ✓ (يفتح كسب النقاط)</SubmitBtn>
              </form>
              <form action={cancelAction}>
                <input type="hidden" name="id" value={o.id} />
                <SubmitBtn danger>إلغاء الطلب (يرجّع المخزون والنقاط)</SubmitBtn>
              </form>
            </Card>
          )}
          {o.status === "DELIVERED" && o.deliveredAt && (
            <Card className="p-5 text-[13px] text-muted">سُلِّم في <span className="font-num">{dateAr(o.deliveredAt)}</span></Card>
          )}
        </div>
      </div>
    </div>
  );
}
