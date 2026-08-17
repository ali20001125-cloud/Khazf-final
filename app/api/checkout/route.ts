import { NextResponse } from "next/server";
import { createOrder, type CheckoutInput } from "@/lib/server/orders";
import { setCustomerCookie } from "@/lib/server/customer-session";
import { notifyOrderTelegram } from "@/lib/server/telegram";
import { emailNewOrderAdmin, emailOrderCustomer } from "@/lib/server/email";
import { getSupabaseUser } from "@/lib/server/customer-identity";
import { and, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { eq } from "drizzle-orm";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // حدّ سخيّ ضد الطلبات الوهمية المبرمَجة (٢٥ كل ٥ دقائق لكل IP) —
  // لا يزعج الزبائن خلف CGNAT، ولدى createOrder حارس تكرار مستقل بالهاتف
  if (!rateLimit(`checkout:${clientIp(req)}`, 25, 300_000))
    return NextResponse.json({ error: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة" }, { status: 429 });
  let body: CheckoutInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  try {
    // لو الزبون مسجّل بإيميل ولم يكتبه بالنموذج → نجيبه من المصادقة تلقائياً
    const authForFill = await getSupabaseUser();
    if (authForFill?.email) {
      if (!body.email?.trim()) body.email = authForFill.email;
      if (!body.name?.trim() || body.name.trim() === "زبون خزف") {
        const local = authForFill.email.split("@")[0].replace(/[0-9._-]+/g, " ").trim();
        if (local) body.name = local.split(" ").filter(Boolean).slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }
    // بيئة الاختبار: لا تُقبل طلبات إلا من هويات الاختبار المسجّلة
    if (process.env.NEXT_PUBLIC_ENV === "staging") {
      const em = (body.email ?? "").trim().toLowerCase();
      const ph = (body.phone ?? "").trim();
      const allowed = (await db.execute(sql`
        SELECT 1 FROM test_identities
        WHERE (kind='email' AND lower(value) = ${em})
           OR (kind='phone' AND value = ${ph}) LIMIT 1`)).rows.length > 0;
      if (!allowed)
        return NextResponse.json(
          { error: "بيئة اختبار — استخدم بريداً أو رقماً مسجّلاً في هويات الاختبار" },
          { status: 403 });
    }

    const result = await createOrder(body);

    /* ═ استرداد السلات ═
       نُعلّم كل سلات هذا الزبون (بالرقم أو الإيميل) كمستردّة — لا سلة الجلسة الحالية فقط.
       يمنع وصول تذكير بعد إتمام الطلب من جلسة قديمة. */
    {
      const rPhone = body.phone?.trim();
      const rEmail = body.email?.trim()?.toLowerCase();
      const conds = [];
      if (rPhone) conds.push(eq(s.abandonedCarts.phone, rPhone));
      if (rEmail) conds.push(sql`lower(${s.abandonedCarts.email}) = ${rEmail}`);
      if (conds.length > 0) {
        await db.update(s.abandonedCarts)
          .set({ recovered: true })
          .where(and(eq(s.abandonedCarts.recovered, false), or(...conds)))
          .catch(() => {});
      }
    }

    /* ═ أمان الهوية ═
       الكوكي (يفتح «حسابي») يُمنح فقط إذا:
       • الرقم جديد (هذا أول طلب له) → حسابه انولد الآن لصاحب الجهاز، أو
       • الرقم مربوط بحساب Google الحاضر نفسه.
       رقم موجود لزبون آخر؟ الطلب يمشي، لكن تاريخه لا يُفتح لغيره. */
    const phone = body.phone.trim();
    const gUser = authForFill; // نعيد استخدام جلسة المصادقة (بدل رحلة شبكة ثانية لـ Supabase)
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
    emailNewOrderAdmin({
      orderNumber: result.orderNumber,
      name: body.name?.trim() || "زبون خزف",
      phone, governorate: body.governorate, total: result.total, invoiceUrl,
      address: body.address?.trim() || null,
      note: body.note?.trim() || null,
      email: body.email?.trim() || null,
      items: result.items?.map((it) => ({ name: it.nameSnapshot, qty: it.qty, line: it.lineTotal })) ?? [],
      itemsSubtotal: result.itemsSubtotal,
      journeyDiscount: result.journeyDiscount,
      pointsUsed: result.pointsUsedDinars,
      deliveryCharged: result.deliveryCharged,
      giftName: result.appliedJourney?.giftName ?? null,
      ordersCount: result.seqNo,
    }).catch(() => {});
    // سياق المكافآت للإيميل: الرصيد بعد الطلب وموقع الزبون من رحلة الولاء
    const rewardCtx = await (async () => {
      try {
        const [c] = await db.select({ b: s.customers.pointsBalance, j: s.customers.journeyOrders })
          .from(s.customers).where(eq(s.customers.phone, body.phone.trim()));
        return { balance: c?.b ?? null, journeyOrders: c?.j ?? null };
      } catch { return { balance: null, journeyOrders: null }; }
    })();

    emailOrderCustomer({
      email: body.email?.trim() || null, orderNumber: result.orderNumber,
      name: body.name?.trim() || "صديق خزف", total: result.total, invoiceUrl,
      items: result.items?.map((it) => ({ name: it.nameSnapshot, qty: it.qty, line: it.lineTotal, image: it.image })) ?? [],
      itemsSubtotal: result.itemsSubtotal, journeyDiscount: result.journeyDiscount,
      pointsUsed: result.pointsUsedDinars, deliveryCharged: result.deliveryCharged,
      freeDelivery: result.deliveryCharged === 0,
      pointsEarned: result.pointsEarned,
      pointsBalanceAfter: rewardCtx.balance ?? undefined,
      journeyOrders: rewardCtx.journeyOrders ?? undefined,
      giftName: result.appliedJourney?.giftName ?? null,
    }).catch(() => {});
    notifyOrderTelegram({
      orderNumber: result.orderNumber, seqNo: result.seqNo, name: body.name?.trim() || "زبون خزف",
      phone, governorate: body.governorate, address: body.address,
      total: result.total, invoiceUrl,
      email: body.email?.trim() || null,
      registered: !!gUser,
      itemsSubtotal: result.itemsSubtotal,
      deliveryCharged: result.deliveryCharged,
      journeyDiscount: result.journeyDiscount,
      journeyPct: result.journeyPct,
      pointsUsed: result.pointsUsedDinars,
      items: result.items?.map((it) => ({ name: it.nameSnapshot, qty: it.qty, line: it.lineTotal, image: it.image })) ?? [],
    }).catch(() => {});

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر إتمام الطلب" }, { status: 400 });
  }
}
