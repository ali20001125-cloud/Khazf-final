import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money } from "@/components/admin/ui";
import { toggleProduct } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const rows = await db.execute(sql`
    SELECT p.*, COALESCE(SUM(b.qty_remaining),0)::int AS stock
    FROM products p LEFT JOIN inventory_batches b ON b.product_id = p.id
    GROUP BY p.id ORDER BY p.type, p.created_at`);
  type Row = { id: number; type: "COFFEE" | "TOOL"; name: string; badge: string | null;
    active: boolean; price_g250: number | null; price_piece: number | null;
    stock_threshold: number; stock: number };
  const products = rows.rows as unknown as Row[];

  return (
    <div>
      <PageTitle title="المنتجات" sub="كل الأسعار يدوية · الرصيد محسوب من الوجبات"
        action={<Link href="/admin/products/new/" className="rounded-[12px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">+ منتج جديد</Link>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line">
            <tr><Th>المنتج</Th><Th>النوع</Th><Th>السعر</Th><Th>الرصيد</Th><Th>الحالة</Th><Th></Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const low = p.stock <= p.stock_threshold;
              const unit = p.type === "COFFEE" ? "غ" : "قطعة";
              const price = p.type === "COFFEE" ? p.price_g250 : p.price_piece;
              return (
                <tr key={p.id} className="hover:bg-bg-alt/50">
                  <Td>
                    <Link href={`/admin/products/${p.id}/`} className="font-bold text-accent">{p.name}</Link>
                    {p.badge && <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{p.badge}</span>}
                  </Td>
                  <Td>{p.type === "COFFEE" ? "قهوة" : "أداة"}</Td>
                  <Td className="font-num">{price ? money(price) : <span className="text-accent">بلا سعر!</span>}</Td>
                  <Td className={`font-num font-semibold ${low ? "text-accent" : ""}`}>
                    {p.stock.toLocaleString("en")} {unit}{low && " ⚠"}
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
