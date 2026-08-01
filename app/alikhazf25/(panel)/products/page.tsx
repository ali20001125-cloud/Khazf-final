import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money } from "@/components/admin/ui";
import { toggleProduct } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoffeePage() {
  const rows = await db.execute(sql`
    SELECT p.*, COALESCE(SUM(b.qty_remaining),0)::int AS stock
    FROM products p LEFT JOIN inventory_batches b ON b.product_id = p.id
    WHERE p.type = 'COFFEE'
    GROUP BY p.id ORDER BY p.created_at`);
  type Row = { id: number; name: string; badge: string | null;
    active: boolean; price_g250: number | null; stock_threshold: number; stock: number };
  const products = rows.rows as unknown as Row[];

  return (
    <div>
      <PageTitle title="القهوة" sub="المحاصيل · الأسعار يدوية · الرصيد محسوب من الوجبات"
        action={<Link href="/alikhazf25/products/new/" className="rounded-[12px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">+ محصول جديد</Link>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line">
            <tr><Th>المحصول</Th><Th>سعر ٢٥٠غ</Th><Th>الرصيد</Th><Th>الحالة</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const low = p.stock <= p.stock_threshold;
              return (
                <tr key={p.id} className="row-tap hover:bg-bg-alt/50">
                  <Td>
                    <Link href={`/alikhazf25/products/${p.id}/`} className="row-link font-bold text-accent">{p.name}</Link>
                    {p.badge && <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{p.badge}</span>}
                  </Td>
                  <Td className="font-num">{p.price_g250 ? money(p.price_g250) : <span className="text-accent">بلا سعر!</span>}</Td>
                  <Td className={`font-num font-semibold ${low ? "text-accent" : ""}`}>
                    {p.stock.toLocaleString("en")} غ{low && " ⚠"}
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
