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

  /* الحسابات المسجّلة (من نظام الدخول) — تشمل من سجّل ولم يطلب بعد */
  let accounts: { email: string; provider: string; created_at: string; linked_phone: string | null; linked_name: string | null }[] = [];
  let accStats = { total: 0, linked: 0, today: 0, week: 0 };
  try {
    accounts = (await db.execute(sql`
      SELECT u.email,
             COALESCE(u.raw_app_meta_data->>'provider','email') AS provider,
             u.created_at::text AS created_at,
             c.phone AS linked_phone, c.name AS linked_name
      FROM auth.users u
      LEFT JOIN customers c ON c.auth_user_id = u.id::text
      ORDER BY u.created_at DESC LIMIT 100`)).rows as unknown as typeof accounts;
    const st = (await db.execute(sql`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM customers c WHERE c.auth_user_id = u.id::text))::int AS linked,
             COUNT(*) FILTER (WHERE u.created_at >= now() - interval '1 day')::int AS today,
             COUNT(*) FILTER (WHERE u.created_at >= now() - interval '7 days')::int AS week
      FROM auth.users u`)).rows[0] as unknown as typeof accStats;
    accStats = st;
  } catch { /* لو تعذّر الوصول لجدول الحسابات، نتجاهل القسم */ }

  return (
    <div>
      <PageTitle title="العملاء" sub="المعرّف = رقم الهاتف"
        action={<form action="/alikhazf25/customers/"><input name="q" defaultValue={q} placeholder="بحث: هاتف / اسم" className={`${inputCls} w-56`} /></form>} />

      {/* الحسابات المسجّلة — تشمل من سجّل ولم يطلب بعد */}
      {accStats.total > 0 && (
        <div className="mb-6">
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4"><p className="text-[11px] text-muted">حسابات مسجّلة</p><p className="font-num mt-1 text-2xl font-bold">{accStats.total}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">أكملوا ملفهم</p><p className="font-num mt-1 text-2xl font-bold text-ok">{accStats.linked}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">آخر ٢٤ ساعة</p><p className="font-num mt-1 text-2xl font-bold text-gold">{accStats.today}</p></Card>
            <Card className="p-4"><p className="text-[11px] text-muted">آخر ٧ أيام</p><p className="font-num mt-1 text-2xl font-bold">{accStats.week}</p></Card>
          </div>
          <details className="rounded-[18px] border border-line bg-card">
            <summary className="cursor-pointer list-none px-5 py-4 text-[13px] font-bold text-muted">
              عرض الحسابات المسجّلة ({accounts.length}) — من سجّل بالبريد أو Google
            </summary>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[620px]">
                <thead className="border-b border-line">
                  <tr><Th>البريد</Th><Th>طريقة التسجيل</Th><Th>الحالة</Th><Th>تاريخ التسجيل</Th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {accounts.map((a) => (
                    <tr key={a.email} className="hover:bg-bg-alt/50">
                      <Td><span className="font-num text-[12.5px]" dir="ltr">{a.email}</span></Td>
                      <Td className="text-[12px]">{a.provider === "google" ? "Google" : "البريد"}</Td>
                      <Td className="text-[12px]">
                        {a.linked_phone
                          ? <Link href={`/alikhazf25/customers/${a.linked_phone}/`} className="font-bold text-accent">{a.linked_name || a.linked_phone}</Link>
                          : <span className="text-muted">سجّل ولم يطلب</span>}
                      </Td>
                      <Td className="font-num text-[11.5px] text-muted">{dateAr(a.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-line">
            <tr><Th>الزبون</Th><Th>المحافظة</Th><Th>طلبات</Th><Th>إجمالي الشراء</Th><Th>نقاط</Th><Th>الرحلة</Th><Th>آخر طلب</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => (
              <tr key={c.phone} className="hover:bg-bg-alt/50">
                <Td>
                  <Link href={`/alikhazf25/customers/${c.phone}/`} className="font-bold text-accent">{c.name}</Link>
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
