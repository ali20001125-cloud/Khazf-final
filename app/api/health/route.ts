/** فحص ذاتي — يشخّص الاتصال بالقاعدة بلا كشف أسرار */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const env = {
    DATABASE_URL: url ? (url.includes("[YOUR-PASSWORD]") ? "⚠️ نسيت تبدّل [YOUR-PASSWORD]" : "موجود ✓") : "❌ مفقود",
    AUTH_SECRET: process.env.AUTH_SECRET ? "موجود ✓" : "❌ مفقود",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? "موجود ✓" : "❌ مفقود",
    host: url.split("@")[1]?.split(":")[0] ?? "—",
  };
  try {
    const r = await db.execute(sql`SELECT count(*)::int n FROM products`);
    return NextResponse.json({ db: "متصل ✓", products: (r.rows[0] as { n: number }).n, env });
  } catch (e) {
    return NextResponse.json(
      { db: "فشل ✗", error: e instanceof Error ? e.message.slice(0, 200) : "unknown", env },
      { status: 500 }
    );
  }
}
