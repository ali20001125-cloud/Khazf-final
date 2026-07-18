import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, Field, inputCls, SubmitBtn, money, dateAr } from "@/components/admin/ui";
import { addShipment, addToolBatch, adjustStock } from "./actions";

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
                {x.type === "COFFEE" ? Math.floor(x.stock / 250).toLocaleString("en") : x.stock.toLocaleString("en")}{" "}
                <span className="text-[11px] font-semibold text-muted">{x.type === "COFFEE" ? "كيس" : "قطعة"}</span>
              </p>
              {x.type === "COFFEE" && <p className="font-num mt-0.5 text-[10.5px] text-muted">{(x.stock / 1000).toLocaleString("en")} كغ</p>}
              {low && <p className="mt-1 text-[10.5px] font-bold text-accent">تحت العتبة ({Math.floor(x.stock_threshold / (x.type === "COFFEE" ? 250 : 1))} {x.type === "COFFEE" ? "كيس" : ""})</p>}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* شحنة قهوة — منطق الكيلو والتوصيل الموزَّع */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-bold">+ شحنة قهوة جديدة</h2>
          <p className="mb-4 text-[11.5px] text-muted">اكتب كل محصول بالكيلو وسعر استيراده للكيلو — التوصيل الإجمالي يتوزّع تلقائياً</p>
          <form action={addShipment} className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px] gap-2">
                <select name={`p${i}_product`} className={inputCls} defaultValue="">
                  <option value="">{i === 1 ? "المحصول" : "— محصول إضافي —"}</option>
                  {stock.filter((x) => x.type === "COFFEE").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <input name={`p${i}_kg`} placeholder="كغ" className={`${inputCls} font-num`} dir="ltr" />
                <input name={`p${i}_import`} placeholder="استيراد/كغ" className={`${inputCls} font-num`} dir="ltr" />
              </div>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="توصيل الشحنة الإجمالي" hint="مثال: 120000 — ينقسم على مجموع الكيلوات">
                <input name="shipTotal" className={`${inputCls} font-num`} dir="ltr" />
              </Field>
              <Field label="تغليف /كغ"><input name="packPerKilo" className={`${inputCls} font-num`} dir="ltr" /></Field>
            </div>
            <Field label="ملاحظة"><input name="note" className={inputCls} placeholder="وجبة تموز مثلاً" /></Field>
            <SubmitBtn>أضف الشحنة</SubmitBtn>
          </form>
        </Card>

        <div className="space-y-5">
          {/* تعديل يدوي بالأكياس */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold">تعديل يدوي (جرد/تالف)</h2>
            <form action={adjustStock} className="grid gap-3 sm:grid-cols-2">
              <Field label="المنتج">
                <select name="productKey" className={inputCls} required
                  onChange={undefined}>
                  {stock.map((x) => <option key={x.id} value={`${x.id}|${x.type}`}>{x.name}</option>)}
                </select>
              </Field>
              <Field label="الكمية ± (كيس / قطعة)" hint="سالب للخصم: -2 = كيسان">
                <input name="delta" required className={`${inputCls} font-num`} dir="ltr" />
              </Field>
              <Field label="السبب"><input name="reason" required className={inputCls} placeholder="كيس تالف" /></Field>
              <div className="flex items-end"><SubmitBtn>نفّذ</SubmitBtn></div>
            </form>
          </Card>

          {/* أدوات — منفصلة */}
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold">+ أدوات (بالقطعة)</h2>
            {stock.some((x) => x.type === "TOOL") ? (
              <form action={addToolBatch} className="grid gap-3 sm:grid-cols-3">
                <select name="productId" className={inputCls}>
                  {stock.filter((x) => x.type === "TOOL").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                <input name="qty" placeholder="عدد القطع" className={`${inputCls} font-num`} dir="ltr" />
                <input name="costPerPiece" placeholder="تكلفة القطعة" className={`${inputCls} font-num`} dir="ltr" />
                <div className="sm:col-span-3"><SubmitBtn>أضف</SubmitBtn></div>
              </form>
            ) : (
              <p className="text-[12.5px] text-muted">ما عندك أدوات بعد — أول ما تضيف أداة من «المنتجات» يظهر نموذجها هنا</p>
            )}
          </Card>
        </div>
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
                  <Td className="font-num">{b.pieceC ? b.qtyReceived.toLocaleString("en") : (b.qtyReceived / 1000).toLocaleString("en") + " كغ"}</Td>
                  <Td className="font-num font-bold">{b.pieceC ? b.qtyRemaining.toLocaleString("en") : Math.floor(b.qtyRemaining / 250).toLocaleString("en") + " كيس"}</Td>
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
