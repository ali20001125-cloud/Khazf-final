import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, Field, inputCls, SubmitBtn, money, dateAr } from "@/components/admin/ui";
import { addBatch, adjustStock } from "./actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const stock = (await db.execute(sql`
    SELECT p.id, p.name, p.type, p.stock_threshold,
      COALESCE(SUM(b.qty_remaining),0)::int AS stock
    FROM products p LEFT JOIN inventory_batches b ON b.product_id=p.id
    GROUP BY p.id ORDER BY p.type, p.name`)).rows as unknown as
    { id: number; name: string; type: string; stock_threshold: number; stock: number }[];

  const batches = await db
    .select({
      id: s.inventoryBatches.id, productId: s.inventoryBatches.productId,
      qtyReceived: s.inventoryBatches.qtyReceived, qtyRemaining: s.inventoryBatches.qtyRemaining,
      importC: s.inventoryBatches.importCostPerKilo, shipC: s.inventoryBatches.shipCostPerKilo,
      packC: s.inventoryBatches.packCostPerKilo, pieceC: s.inventoryBatches.costPerPiece,
      note: s.inventoryBatches.note, receivedAt: s.inventoryBatches.receivedAt,
      pname: s.products.name,
    })
    .from(s.inventoryBatches)
    .innerJoin(s.products, sql`${s.products.id} = ${s.inventoryBatches.productId}`)
    .orderBy(desc(s.inventoryBatches.receivedAt))
    .limit(25);

  const moves = await db
    .select({
      id: s.inventoryMovements.id, type: s.inventoryMovements.type,
      qty: s.inventoryMovements.qtyDelta, reason: s.inventoryMovements.reason,
      at: s.inventoryMovements.createdAt, pname: s.products.name, orderId: s.inventoryMovements.orderId,
    })
    .from(s.inventoryMovements)
    .innerJoin(s.products, sql`${s.products.id} = ${s.inventoryMovements.productId}`)
    .orderBy(desc(s.inventoryMovements.createdAt))
    .limit(30);

  const typeLabel: Record<string, string> = { IN: "استلام", SALE: "بيع", ADJUSTMENT: "تعديل", CANCEL_RETURN: "إرجاع إلغاء" };

  return (
    <div>
      <PageTitle title="المخزون والوجبات" sub="القهوة بالغرام · الأدوات بالقطعة · التكلفة تعيش مع الوجبة" />

      {/* الرصيد الحالي */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stock.map((x) => {
          const low = x.stock <= x.stock_threshold;
          return (
            <Card key={x.id} className={`p-4 ${low ? "border-accent/40 bg-accent/5" : ""}`}>
              <p className="text-[13px] font-bold">{x.name}</p>
              <p className={`font-num mt-1.5 text-xl font-bold ${low ? "text-accent" : ""}`}>
                {x.stock.toLocaleString("en")} <span className="text-[11px] font-semibold text-muted">{x.type === "COFFEE" ? "غرام" : "قطعة"}</span>
              </p>
              {low && <p className="mt-1 text-[10.5px] font-bold text-accent">تحت العتبة ({x.stock_threshold})</p>}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* إضافة وجبة */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">+ وجبة استلام جديدة</h2>
          <form action={addBatch} className="grid gap-3 sm:grid-cols-2">
            <Field label="المنتج">
              <select name="productId" required className={inputCls}>
                {stock.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label="الكمية" hint="غرام / قطعة"><input name="qty" required className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="استيراد /كيلو"><input name="importCost" className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="توصيل /كيلو"><input name="shipCost" className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="تغليف /كيلو"><input name="packCost" className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="تكلفة القطعة (أداة)"><input name="costPerPiece" className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="ملاحظة"><input name="note" className={inputCls} /></Field>
            <div className="flex items-end"><SubmitBtn>أضف الوجبة</SubmitBtn></div>
          </form>
        </Card>

        {/* تعديل يدوي */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">تعديل يدوي (جرد/تالف)</h2>
          <form action={adjustStock} className="grid gap-3 sm:grid-cols-2">
            <Field label="المنتج">
              <select name="productId" required className={inputCls}>
                {stock.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
            <Field label="الكمية ±" hint="سالب للخصم: -250"><input name="delta" required className={`${inputCls} font-num`} dir="ltr" /></Field>
            <Field label="السبب"><input name="reason" required className={inputCls} placeholder="مثال: كيس تالف" /></Field>
            <div className="flex items-end"><SubmitBtn>نفّذ التعديل</SubmitBtn></div>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">كل تعديل يُسجَّل بسجل الحركات — لا شيء يضيع</p>
        </Card>
      </div>

      {/* الوجبات */}
      <h2 className="mb-3 mt-8 text-lg font-bold">آخر الوجبات</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line">
            <tr><Th>المنتج</Th><Th>المستلَم</Th><Th>المتبقي</Th><Th>التكلفة</Th><Th>التاريخ</Th><Th>ملاحظة</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {batches.map((b) => {
              const perKilo = (b.importC ?? 0) + (b.shipC ?? 0) + (b.packC ?? 0);
              return (
                <tr key={b.id}>
                  <Td className="font-semibold">{b.pname}</Td>
                  <Td className="font-num">{b.qtyReceived.toLocaleString("en")}</Td>
                  <Td className="font-num font-bold">{b.qtyRemaining.toLocaleString("en")}</Td>
                  <Td className="font-num text-[12px]">{b.pieceC ? `${money(b.pieceC)}/قطعة` : perKilo ? `${money(perKilo)}/كغ` : "—"}</Td>
                  <Td className="font-num text-[11.5px] text-muted">{dateAr(b.receivedAt)}</Td>
                  <Td className="text-[12px] text-muted">{b.note ?? ""}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* سجل الحركات */}
      <h2 className="mb-3 mt-8 text-lg font-bold">سجل الحركات</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line">
            <tr><Th>المنتج</Th><Th>النوع</Th><Th>الكمية</Th><Th>المرجع</Th><Th>الوقت</Th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {moves.map((m) => (
              <tr key={m.id}>
                <Td className="font-semibold">{m.pname}</Td>
                <Td>{typeLabel[m.type] ?? m.type}</Td>
                <Td className={`font-num font-bold ${m.qty >= 0 ? "text-ok" : "text-accent"}`}>{m.qty > 0 ? "+" : ""}{m.qty.toLocaleString("en")}</Td>
                <Td className="text-[12px] text-muted">
                  {m.orderId ? <Link href={`/admin/orders/${m.orderId}/`} className="font-num text-accent">{m.reason}</Link> : m.reason}
                </Td>
                <Td className="font-num text-[11.5px] text-muted">{dateAr(m.at)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
