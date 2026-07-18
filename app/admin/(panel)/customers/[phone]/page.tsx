import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, StatusBadge, money, dateAr, Field, inputCls, SubmitBtn } from "@/components/admin/ui";
import { saveNotes, manualPoints, toggleJourney } from "../actions";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ phone: string }> }) {
  const { phone } = await params;
  const [c] = await db.select().from(s.customers).where(eq(s.customers.phone, phone));
  if (!c) notFound();
  const orders = await db.select().from(s.orders).where(eq(s.orders.customerPhone, phone)).orderBy(desc(s.orders.createdAt)).limit(20);
  const ledger = await db.select().from(s.cashbackLedger).where(eq(s.cashbackLedger.customerPhone, phone)).orderBy(desc(s.cashbackLedger.createdAt)).limit(20);
  const tl: Record<string, string> = { EARN: "كسب", USE: "استخدام", EXPIRE: "انتهاء", MANUAL: "إداري" };

  return (
    <div>
      <PageTitle title={c.name} sub={c.phone} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-line"><tr>
                <th className="px-4 py-3 text-start text-[11px] font-bold text-muted">الطلب</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold text-muted">الإجمالي</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold text-muted">الحالة</th>
                <th className="px-4 py-3 text-start text-[11px] font-bold text-muted">التاريخ</th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}/`} className="font-num font-bold text-accent">{o.orderNumber}</Link></td>
                    <td className="font-num px-4 py-3 font-semibold">{money(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="font-num px-4 py-3 text-[11.5px] text-muted">{dateAr(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">سجل النقاط</h2>
            <ul className="divide-y divide-line">
              {ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span>{tl[l.type]} {l.note && <span className="text-muted">— {l.note}</span>}</span>
                  <span className={`font-num font-bold ${l.type === "USE" || l.type === "EXPIRE" ? "text-accent" : "text-ok"}`}>
                    {l.type === "USE" || l.type === "EXPIRE" ? "−" : "+"}{l.points}
                  </span>
                </li>
              ))}
              {ledger.length === 0 && <li className="py-4 text-center text-[13px] text-muted">لا حركات بعد</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[12px] text-muted">الرصيد الحالي</p>
            <p className="font-num mt-1 text-3xl font-bold text-gold">{c.pointsBalance} <span className="text-sm">نقطة</span></p>
            <p className="font-num mt-1 text-[12px] text-muted">الرحلة: {c.journeyActive ? `${c.journeyOrders}/6` : "متوقفة"}
              {c.loyaltyExpiresAt && ` · تنتهي ${dateAr(c.loyaltyExpiresAt)}`}</p>
            <form action={toggleJourney} className="mt-3">
              <input type="hidden" name="phone" value={c.phone} />
              <button className="text-[12px] font-bold text-accent">{c.journeyActive ? "إيقاف الرحلة" : "تفعيل الرحلة"}</button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">نقاط يدوية ±</h2>
            <form action={manualPoints} className="space-y-3">
              <input type="hidden" name="phone" value={c.phone} />
              <Field label="النقاط" hint="سالب للخصم"><input name="points" className={`${inputCls} font-num`} dir="ltr" /></Field>
              <Field label="السبب"><input name="note" className={inputCls} placeholder="تعويض / مكافأة" /></Field>
              <SubmitBtn>نفّذ</SubmitBtn>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-muted">ملاحظات داخلية</h2>
            <form action={saveNotes} className="space-y-3">
              <input type="hidden" name="phone" value={c.phone} />
              <textarea name="notes" rows={4} defaultValue={c.adminNotes ?? ""} className={inputCls} placeholder="لا يراها الزبون" />
              <SubmitBtn>حفظ</SubmitBtn>
            </form>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">{c.governorate} · {c.address}{c.email ? ` · ${c.email}` : ""}{c.marketingOptIn ? " · ✅ يقبل العروض" : ""}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
