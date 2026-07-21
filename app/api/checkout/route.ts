import { NextResponse } from "next/server";
import { createOrder, type CheckoutInput } from "@/lib/server/orders";
import { setCustomerCookie } from "@/lib/server/customer-session";
import { notifyOrderTelegram } from "@/lib/server/telegram";
import { emailNewOrderAdmin, emailOrderCustomer } from "@/lib/server/email";
import { getSupabaseUser } from "@/lib/server/customer-identity";
import { and, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: CheckoutInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  try {
    const result = await createOrder(body);

    /* ═ أمان الهوية ═
       الكوكي (يفتح «حسابي») يُمنح فقط إذا:
       • الرقم جديد (هذا أول طلب له) → حسابه انولد الآن لصاحب الجهاز، أو
       • الرقم مربوط بحساب Google الحاضر نفسه.
       رقم موجود لزبون آخر؟ الطلب يمشي، لكن تاريخه لا يُفتح لغيره. */
    const phone = body.phone.trim();
    const gUser = await getSupabaseUser();
    const [c] = await db.select({ auth: s.customers.authUserId }).from(s.customers).where(eq(s.customers.phone, phone));
    const cnt = await db.execute(sql`SELECT count(*)::int n FROM orders WHERE customer_phone=${phone}`);
    const firstOrder = Number((cnt.rows[0] as { n: number }).n) === 1;

    /* ربط Google تلقائي لأول طلب لرقم غير مربوط (وحساب Google غير مربوط برقم آخر) */
    let linkedToMe = !!(gUser && c?.auth && c.auth === gUser.id);
    if (gUser && c && !c.auth && firstOrder) {
      const [already] = await db.select({ p: s.customers.phone }).from(s.customers).where(eq(s.customers.authUserId, gUser.id));
      if (!already) {
        await db.update(s.customers).set({ authUserId: gUser.id }).where(eq(s.customers.phone, phone));
        linkedToMe = true;
      }
    }
    if (firstOrder || linkedToMe) await setCustomerCookie(phone);

    /* إشعارات الإيميل (لا توقف الطلب إن فشلت) */
    const site = process.env.SITE_URL ?? "https://khazf.shop";
    const invoiceUrl = `${site}/invoice/?n=${result.orderNumber}&p=${encodeURIComponent(phone)}`;
    emailNewOrderAdmin({ orderNumber: result.orderNumber, name: body.name?.trim() || "زبون خزف", phone, governorate: body.governorate, total: result.total, invoiceUrl }).catch(() => {});
    emailOrderCustomer({ email: body.email?.trim() || null, orderNumber: result.orderNumber, name: body.name?.trim() || "صديق خزف", total: result.total, invoiceUrl }).catch(() => {});
    notifyOrderTelegram({
      orderNumber: result.orderNumber, seqNo: result.seqNo, name: body.name?.trim() || "زبون خزف",
      phone, governorate: body.governorate, address: body.address,
      total: result.total, invoiceUrl,
      items: result.items?.map((it) => ({ name: it.nameSnapshot, qty: it.qty, line: it.lineTotal })) ?? [],
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر إتمام الطلب" }, { status: 400 });
  }
}
