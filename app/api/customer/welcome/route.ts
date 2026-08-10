import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { getSupabaseUser } from "@/lib/server/customer-identity";
import { emailWelcome } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * يُستدعى فور نجاح التسجيل (جوجل أو بريد).
 * ينشئ سجلّ العميل ببريده — بلا هاتف ولا محافظة — ويرسل الترحيب مرة واحدة.
 */
export async function POST() {
  const user = await getSupabaseUser();
  if (!user?.email) return NextResponse.json({ ok: false });

  const email = user.email.trim().toLowerCase();
  const nice = email.split("@")[0];

  // مرتبط بحساب زبون؟
  const [byAuth] = await db.select().from(s.customers).where(eq(s.customers.authUserId, user.id));
  if (byAuth) {
    if (!byAuth.welcomedAt) {
      await db.update(s.customers).set({ welcomedAt: new Date() }).where(eq(s.customers.phone, byAuth.phone));
      emailWelcome({ email: byAuth.email || email, name: byAuth.name || nice }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  // زبون سابق بنفس البريد؟ نربطه
  const [byEmail] = await db.select().from(s.customers).where(sql`lower(${s.customers.email}) = ${email}`);
  if (byEmail) {
    const first = !byEmail.welcomedAt;
    await db.update(s.customers)
      .set({ authUserId: user.id, welcomedAt: byEmail.welcomedAt ?? new Date() })
      .where(eq(s.customers.phone, byEmail.phone));
    if (first) emailWelcome({ email, name: byEmail.name || nice }).catch(() => {});
    return NextResponse.json({ ok: true, linked: true });
  }

  // عميل جديد بلا هاتف — معرّف مؤقّت يُستبدل عند أول طلب
  await db.insert(s.customers).values({
    phone: `auth:${user.id.slice(0, 18)}`, authUserId: user.id,
    name: nice, email, governorate: "", address: "",
    welcomedAt: new Date(),
  }).onConflictDoNothing();

  emailWelcome({ email, name: nice }).catch(() => {});
  return NextResponse.json({ ok: true, created: true });
}
