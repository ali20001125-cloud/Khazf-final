import Link from "next/link";
import { desc, eq, ilike, or, sql, and, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, StatusBadge, money, dateAr, inputCls } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const tabs = [
  { k: "CONFIRMED", l: "بانتظار التوصيل" },
  { k: "DELIVERED", l: "المُسلَّمة" },
  { k: "CANCELLED", l: "الملغاة" },
  { k: "ALL", l: "الكل" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ s?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = tabs.some((t) => t.k === sp.s) ? sp.s! : "CONFIRMED";
  const q = sp.q?.trim();

  const conds: SQL[] = [];
  if (tab !== "ALL") conds.push(eq(s.orders.status, tab as "CONFIRMED" | "DELIVERED" | "CANCELLED"));
  if (q) conds.push(or(ilike(s.orders.orderNumber, `%${q}%`), ilike(s.orders.phone, `%${q}%`), ilike(s.orders.name, `%${q}%`))!);

  const rows = await db
    .select()
    .from(s.orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(s.orders.createdAt))
    .limit(80);

  const counts = await db
    .select({ status: s.orders.status, n: sql<number>`count(*)::int` })
    .from(s.orders)
    .groupBy(s.orders.status);
  const cnt = (k: string) => counts.find((c) => c.status === k)?.n ?? 0;

  return (
    <div>
      <PageTitle title="الطلبات" sub="حالتان فقط: تأكيد ← توصيل · الإلغاء يرجّع كل شيء" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <Link key={t.k} href={`/admin/orders/?s=${t.k}`}
            className={`rounded-full px-4 py-2 text-[12.5px] font-bold ${tab === t.k ? "bg-olive text-olive-text" : "bg-card text-muted border border-line"}`}>
            {t.l}{t.k !== "ALL" && <span className="font-num ms-1.5">({cnt(t.k)})</span>}
          </Link>
        ))}
        <form className="ms-auto" action="/admin/orders/">
          <input type="hidden" name="s" value={tab} />
          <input name="q" defaultValue={q} placeholder="بحث: رقم طلب / هاتف / اسم" className={`${inputCls} w-64`} />
        </form>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line">
            <tr><Th>الطلب</Th><Th>الزبون</Th><Th>المحافظة</Th><Th>الإجمالي</Th><Th>الربح</Th><Th>الحالة</Th><Th>التاريخ</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((o) => (
              <tr key={o.id} className="transition-colors hover:bg-bg-alt/50">
                <Td><Link href={`/admin/orders/${o.id}/`} className="font-num font-bold text-accent">{o.orderNumber}</Link></Td>
                <Td>
                  <p className="font-semibold">{o.name}</p>
                  <p className="font-num text-[11px] text-muted" dir="ltr">{o.phone}</p>
                </Td>
                <Td>{o.governorate}</Td>
                <Td className="font-num font-bold">{money(o.total)}</Td>
                <Td className={`font-num font-semibold ${o.productProfit + o.deliveryNet >= 0 ? "text-ok" : "text-accent"}`}>
                  {money(o.productProfit + o.deliveryNet)}
                </Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td className="font-num text-[11.5px] text-muted">{dateAr(o.createdAt)}</Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><Td className="py-10 text-center text-muted">لا طلبات هنا</Td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
