import { NextResponse } from "next/server";
import { db, schema as s } from "@/lib/server/db";
import { eq, sql } from "drizzle-orm";
import { getAdmin } from "@/lib/server/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** يحفظ لقطة السلة عند صفحة الدفع (لكشف الهجران لاحقاً) */
export async function POST(req: Request) {
  try {
    // لا نتتبّع سلة المدير عند اختباره المتجر
    const admin = await getAdmin().catch(() => null);
    if (admin) return NextResponse.json({ ok: true, skipped: "admin" });

    const b = await req.json();
    if (!b.sessionId) return NextResponse.json({ ok: false });
    const items = Array.isArray(b.items) ? b.items : [];
    if (items.length === 0) return NextResponse.json({ ok: false });

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
