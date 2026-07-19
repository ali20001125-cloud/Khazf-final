import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { PageTitle, Card, Th, Td, Field, inputCls, SubmitBtn, money, dateAr } from "@/components/admin/ui";
import { addToolBatch, adjustStock } from "./actions";
import ShipmentForm from "./ShipmentForm";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const stock = (await db.execute(sql`
    SELECT p.id, p.name, p.type, p.stock_threshold,
      COALESCE(SUM(b.qty_remaining),0)::int AS stock
    FROM products p LEFT JOIN inventory_batches b ON b.product_id=p.id
    GROUP BY p.id ORDER BY p.type, p.name`)).rows as unknown as
    { id: number; name: string; type: string; stock_threshold: number; stock: number }[];

  let shipmentsList: (typeof s.shipments.$inferSelect)[] = [];
  let needsUpgrade = false;
  try {
    shipmentsList = await db.select().from(s.shipments).orderBy(desc(s.shipments.receivedAt)).limit(12);
  } catch { needsUpgrade = true; }
  type BRow = { id: number; productId: number; qtyReceived: number; qtyRemaining: number;
    importC: number | null; shipC: number | null; packC: number | null; pieceC: number | null;
    note: string | null; receivedAt: Date; shipmentId: number | null; pname: string };
  let batches0: BRow[] = [];
  try { batches0 = await db
    .select({
      id: s.inventoryBatches.id, productId: s.inventoryBatches.productId,
      qtyReceived: s.inventoryBatches.qtyReceived, qtyRemaining: s.inventoryBatches.qtyRemaining,
      importC: s.inventoryBatches.importCostPerKilo, shipC: s.inventoryBatches.shipCostPerKilo,
      packC: s.inventoryBatches.packCostPerKilo, pieceC: s.inventoryBatches.costPerPiece,
      note: s.inventoryBatches.note, receivedAt: s.inventoryBatches.receivedAt,
      shipmentId: s.inventoryBatches.shipmentId,
      pname: s.products.name,
    })
    .from(s.inventoryBatches)
    .innerJoin(s.products, sql`${s.products.id} = ${s.inventoryBatches.productId}`)
    .orderBy(desc(s.inventoryBatches.receivedAt))
    .limit(60); } catch { needsUpgrade = true; }
  const batches = batches0;

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
      <PageTitle title="المخزون والشحنات" sub="القهوة بالأكياس · كل شحنة وحدة محفوظة بتفاصيلها" />
      {needsUpgrade && (
        <Card className="mb-5 border-accent/40 bg-accent/5 p-4 text-[13px] font-bold text-accent">
          ⚠️ قاعدة بياناتك تحتاج سطرَي تحديث (جدول الشحنات) — انسخهما من رسالة كلود والصقهما بـ Supabase ثم حدّث الصفحة
        </Card>
      )}

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
        {/* شحنة قهوة — حساب حي */}
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-bold">+ شحنة قهوة جديدة</h2>
          <p className="mb-4 text-[11.5px] text-muted">اكتب الكلية وتوصيلها، ووزّع — الباقي والحسابات تلقائية</p>
          <ShipmentForm coffees={stock.filter((x) => x.type === "COFFEE").map((x) => ({ id: x.id, name: x.name }))} />
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

      {/* الشحنات — كل شحنة ببطاقتها وتفاصيلها */}
      <h2 className="mb-3 mt-8 text-lg font-bold">الشحنات</h2>
      <div className="grid gap-3">
        {shipmentsList.map((sh) => {
          const mine = batches.filter((b) => b.shipmentId === sh.id);
          const shipPerKilo = Math.round(sh.shipTotal / (sh.totalGrams / 1000));
          return (
            <Card key={sh.id} className="p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="font-bold">شحنة <span className="font-num">#{sh.id}</span></p>
                <p className="font-num text-[12.5px] text-muted">{(sh.totalGrams / 1000).toLocaleString("en")} كغ · توصيل {money(sh.shipTotal)} ({money(shipPerKilo)}/كغ)</p>
                <p className="font-num ms-auto text-[11.5px] text-muted">{dateAr(sh.receivedAt)}</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {mine.map((b) => (
                  <div key={b.id} className="rounded-[12px] bg-bg-alt px-4 py-3">
                    <p className="text-[12.5px] font-bold">{b.pname}</p>
                    <p className="font-num mt-1 text-[11.5px] text-muted">
                      {(b.qtyReceived / 1000).toLocaleString("en")} كغ ({Math.round(b.qtyReceived / 250)} كيس) · باقي <b className="text-ink">{Math.floor(b.qtyRemaining / 250)}</b> كيس
                    </p>
                    <p className="font-num mt-0.5 text-[11px] text-muted">سعر الكيلو {money(b.importC ?? 0)}</p>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {shipmentsList.length === 0 && <Card className="p-8 text-center text-[13px] text-muted">لا شحنات بعد — أضف أول شحنة فوق</Card>}
      </div>

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
