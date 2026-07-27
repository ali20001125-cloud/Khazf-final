import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money } from "@/components/admin/ui";
import { toggleProduct } from "../products/actions";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const rows = await db.execute(sql`
    SELECT p.*, COALESCE(SUM(b.qty_remaining),0)::int AS stock,
           sc.name AS sub_name
    FROM products p
    LEFT JOIN inventory_batches b ON b.product_id = p.id
    LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
    WHERE p.type = 'TOOL'
    GROUP BY p.id, sc.name ORDER BY p.created_at`);
  type Row = { id: number; name: string; badge: string | null; active: boolean;
    price_piece: number | null; stock_threshold: number; stock: number; sub_name: string | null };
  const tools = rows.rows as unknown as Row[];

  return (
    <div>
      <PageTitle title="الأدوات" sub="أقماع · فلاتر · سيرفرات · الأسعار يدوية"
        action={<Link href="/alikhazf25/tools/new/" className="rounded-[12px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">+ أداة جديدة</Link>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="border-b border-line">
            <tr><Th>الأداة</Th><Th>الصنف</Th><Th>السعر</Th><Th>الرصيد</Th><Th>الحالة</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tools.map((p) => {
              const low = p.stock <= p.stock_threshold;
              return (
                <tr key={p.id} className="hover:bg-bg-alt/50">
                  <Td>
                    <Link href={`/alikhazf25/tools/${p.id}/`} className="font-bold text-accent">{p.name}</Link>
                    {p.badge && <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{p.badge}</span>}
                  </Td>
                  <Td className="text-[12px] text-muted">{p.sub_name ?? "—"}</Td>
                  <Td className="font-num">{p.price_piece ? money(p.price_piece) : <span className="text-accent">بلا سعر!</span>}</Td>
                  <Td className={`font-num font-semibold ${low ? "text-accent" : ""}`}>
                    {p.stock.toLocaleString("en")} قطعة{low && " ⚠"}
                  </Td>
                  <Td>{p.active ? <span className="text-ok font-bold text-[12px]">فعّال</span> : <span className="text-muted text-[12px]">مخفي</span>}</Td>
                  <Td>
                    <form action={toggleProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-[12px] font-bold text-muted hover:text-ink">{p.active ? "إخفاء" : "تفعيل"}</button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
