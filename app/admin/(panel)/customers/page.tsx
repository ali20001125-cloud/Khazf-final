import Link from "next/link";
import { desc, ilike, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money, dateAr, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = (await db.execute(sql`
    SELECT c.phone, c.name, c.governorate, c.points_balance, c.journey_orders, c.journey_active,
      c.last_order_at, COUNT(o.id)::int AS orders_count, COALESCE(SUM(o.total),0)::int AS lifetime
    FROM customers c LEFT JOIN orders o ON o.customer_phone = c.phone AND o.status <> 'CANCELLED'
    ${q?.trim() ? sql`WHERE c.phone ILIKE ${"%" + q + "%"} OR c.name ILIKE ${"%" + q + "%"}` : sql``}
    GROUP BY c.phone ORDER BY c.last_order_at DESC NULLS LAST LIMIT 100`)).rows as unknown as
    { phone: string; name: string; governorate: string; points_balance: number; journey_orders: number;
      journey_active: boolean; last_order_at: string | null; orders_count: number; lifetime: number }[];

  return (
    <div>
      <PageTitle title="العملاء" sub="المعرّف = رقم الهاتف"
        action={<form action="/admin/customers/"><input name="q" defaultValue={q} placeholder="بحث: هاتف / اسم" className={`${inputCls} w-56`} /></form>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line">
            <tr><Th>الزبون</Th><Th>المحافظة</Th><Th>طلبات</Th><Th>إجمالي الشراء</Th><Th>نقاط</Th><Th>الرحلة</Th><Th>آخر طلب</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.phone} className="hover:bg-bg-alt/50">
                <Td>
                  <Link href={`/admin/customers/${c.phone}/`} className="font-bold text-accent">{c.name}</Link>
                  <p className="font-num text-[11px] text-muted" dir="ltr">{c.phone}</p>
                </Td>
                <Td>{c.governorate}</Td>
                <Td className="font-num">{c.orders_count}</Td>
                <Td className="font-num font-semibold">{money(c.lifetime)}</Td>
                <Td className="font-num text-gold font-bold">{c.points_balance}</Td>
                <Td className="font-num">{c.journey_active ? `${c.journey_orders}/6` : "متوقفة"}</Td>
                <Td className="font-num text-[11.5px] text-muted">{c.last_order_at ? dateAr(c.last_order_at) : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
