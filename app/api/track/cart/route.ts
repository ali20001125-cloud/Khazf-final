import { NextResponse } from "next/server";
import { db, schema as s } from "@/lib/server/db";
import { eq, sql } from "drizzle-orm";
import { getAdmin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** يحفظ لقطة السلة عند صفحة الدفع (لكشف الهجران لاحقاً) */
export async function POST(req: Request) {
  // هويات الاختبار لا تُسجَّل سلاتها
  try {
    const bodyPeek = await req.clone().json().catch(() => ({}));
    const em = String(bodyPeek?.email ?? "").trim().toLowerCase();
    const ph = String(bodyPeek?.phone ?? "").trim();
    if (em || ph) {
      const t = await db.execute(sql`
        SELECT 1 FROM test_identities
        WHERE (kind='email' AND lower(value) = ${em})
           OR (kind='phone' AND value = ${ph}) LIMIT 1`);
      if (t.rows.length > 0) return NextResponse.json({ ok: true, skipped: "test" });
    }
  } catch { /* تجاهل */ }

  try {
    // لا نتتبّع سلة المدير عند اختباره المتجر
    const admin = await getAdmin().catch(() => null);
    if (admin) return NextResponse.json({ ok: true, skipped: "admin" });

    const b = await req.json();
    if (!b.sessionId) return NextResponse.json({ ok: false });
    const items = Array.isArray(b.items) ? b.items : [];
    if (items.length === 0) return NextResponse.json({ ok: false });

    // نسجّل فقط لمن له وسيلة تواصل (إيميل أو رقم) — المجهول تماماً لا يمكن تذكيره
    const hasContact = (b.email && String(b.email).includes("@")) || (b.phone && String(b.phone).length >= 10);
    if (!hasContact) return NextResponse.json({ ok: true, skipped: "no-contact" });

    await db
      .insert(s.abandonedCarts)
      .values({
        sessionId: String(b.sessionId).slice(0, 60),
        phone: b.phone ? String(b.phone).slice(0, 20) : null,
        name: b.name ? String(b.name).slice(0, 60) : null,
        email: b.email ? String(b.email).slice(0, 120) : null,
        items,
        itemsTotal: Number(b.itemsTotal) || 0,
        recovered: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: s.abandonedCarts.sessionId,
        set: {
          phone: b.phone ? String(b.phone).slice(0, 20) : null,
          name: b.name ? String(b.name).slice(0, 60) : null,
          email: b.email ? String(b.email).slice(0, 120) : null,
          items,
          itemsTotal: Number(b.itemsTotal) || 0,
          updatedAt: new Date(),
        },
      });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

/** يُعلّم السلة كمستردّة عند إتمام الطلب */
export async function PATCH(req: Request) {
  try {
    const b = await req.json();
    if (!b.sessionId) return NextResponse.json({ ok: false });
    await db
      .update(s.abandonedCarts)
      .set({ recovered: true })
      .where(eq(s.abandonedCarts.sessionId, String(b.sessionId)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
