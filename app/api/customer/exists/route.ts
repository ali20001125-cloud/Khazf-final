import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** يتحقق: هل الإيميل له ملف زبون مكتمل (اسم + هاتف)؟ */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ exists: false });
  const [c] = await db
    .select({ phone: s.customers.phone, name: s.customers.name })
    .from(s.customers)
    .where(eq(s.customers.email, email));
  return NextResponse.json({ exists: !!(c && c.phone && c.name) });
}
