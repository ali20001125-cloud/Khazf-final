import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, money } from "@/components/admin/ui";
import { toggleProduct } from "../products/actions";

export const dynamic = "force-dynamic";

type Row = {
  id: number; name: string; badge: string | null; active: boolean;
  price_piece: number | null; sale_price: number | null; stock_threshold: number;
  stock: number; stock_source: string; sub_name: string | null;
  place_slugs: string | null; variants_count: number;
};

/* أقسام المتجر — كل قسم بمكانه */
const SECTIONS = [
  { slug: "drip_tools", title: "أدوات التقطير", hint: "أقماع · فلاتر · سيرفرات · غلايات · موازين" },
  { slug: "espresso_tools", title: "أدوات الإسبريسو", hint: "تامبر · موزّعات · حلقات" },
  { slug: "cups", title: "الأكواب والتقديم", hint: "أكواب سيراميك وزجاج · أطقم" },
];

export default async function ToolsPage() {
  const rows = await db.execute(sql`
    SELECT p.id, p.name, p.badge, p.active, p.price_piece, p.sale_price, p.stock_threshold,
           sc.name AS sub_name,
           (SELECT string_agg(pl.slug, ',') FROM product_places pp
              JOIN places pl ON pl.id = pp.place_id WHERE pp.product_id = p.id) AS place_slugs,
           (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id)::int AS variants_count,
           -- المخزون من مصدره الصحيح: الخيارات ثم الحقل العام ثم الوجبات
           CASE
             WHEN (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id) > 0
               THEN (SELECT COALESCE(SUM(stock),0) FROM product_variants v WHERE v.product_id = p.id)
             WHEN p.stock_pieces IS NOT NULL THEN p.stock_pieces
             ELSE (SELECT COALESCE(SUM(qty_remaining),0) FROM inventory_batches b WHERE b.product_id = p.id)
           END::int AS stock,
           CASE
             WHEN (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id) > 0 THEN 'خيارات'
             WHEN p.stock_pieces IS NOT NULL THEN 'مباشر'
             ELSE 'وجبات'
           END AS stock_source
    FROM products p
    LEFT JOIN subcategories sc ON sc.id = p.subcategory_id
    WHERE p.type = 'TOOL'
    ORDER BY sc.sort NULLS LAST, p.name`);
  const tools = rows.rows as unknown as Row[];

  const inPlace = (t: Row, slug: string) => (t.place_slugs ?? "").split(",").includes(slug);
  const unassigned = tools.filter((t) => !SECTIONS.some((s) => inPlace(t, s.slug)));

  return (
    <div>
      <PageTitle title="الأدوات" sub="مقسّمة حسب أقسام المتجر"
        action={<Link href="/alikhazf25/tools/new/" className="rounded-[12px] bg-olive px-5 py-2.5 text-[13px] font-bold text-olive-text">+ أداة جديدة</Link>} />

      {SECTIONS.map((sec) => {
        const list = tools.filter((t) => inPlace(t, sec.slug));
        return (
          <div key={sec.slug} className="mb-7">
            <div className="mb-2.5 flex items-baseline gap-2.5">
              <h2 className="text-[15px] font-bold">{sec.title}</h2>
              <span className="font-num text-[12px] text-muted">({list.length})</span>
              <span className="text-[11.5px] text-muted">{sec.hint}</span>
            </div>
            {list.length === 0 ? (
              <Card className="p-5 text-center text-[12.5px] text-muted">لا منتجات بهذا القسم بعد</Card>
            ) : (
              <ToolTable list={list} />
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="mb-7">
          <div className="mb-2.5 flex items-baseline gap-2.5">
            <h2 className="text-[15px] font-bold text-accent">بلا قسم</h2>
            <span className="font-num text-[12px] text-muted">({unassigned.length})</span>
            <span className="text-[11.5px] text-muted">لن تظهر بالمتجر — حدّد لها قسماً من «أماكن الظهور»</span>
          </div>
          <ToolTable list={unassigned} />
        </div>
      )}
    </div>
  );
}

function ToolTable({ list }: { list: Row[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead className="border-b border-line">
          <tr><Th>الأداة</Th><Th>الصنف</Th><Th>السعر</Th><Th>الرصيد</Th><Th>الحالة</Th><Th></Th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {list.map((p) => {
            const low = p.stock <= p.stock_threshold;
            return (
              <tr key={p.id} className="row-tap hover:bg-bg-alt/50">
                <Td>
                  <Link href={`/alikhazf25/tools/${p.id}/`} className="row-link font-bold text-accent">{p.name}</Link>
                  {p.badge && <span className="ms-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">{p.badge}</span>}
                </Td>
                <Td className="text-[12px] text-muted">{p.sub_name ?? "—"}</Td>
                <Td className="font-num">
                  {p.sale_price != null ? (
                    <span>{money(p.sale_price)} <span className="text-[11px] text-muted line-through">{p.price_piece ? money(p.price_piece) : ""}</span></span>
                  ) : p.price_piece ? money(p.price_piece)
                    : p.variants_count > 0 ? <span className="text-[11.5px] text-muted">حسب الخيار</span>
                    : <span className="text-accent">بلا سعر!</span>}
                </Td>
                <Td className={`font-num font-semibold ${low ? "text-accent" : ""}`}>
                  {p.stock.toLocaleString("en")}
                  <span className="ms-1 text-[10.5px] font-normal text-muted">{p.stock_source}</span>
                  {low && " ⚠"}
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
  );
}
