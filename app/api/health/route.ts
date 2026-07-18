/** فحص ذاتي عميق — يكشف السبب الجذري للاتصال */
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rootMsg(e: unknown): string {
  let cur: unknown = e, msg = "";
  for (let i = 0; i < 5 && cur; i++) {
    if (cur instanceof Error) { msg = cur.message; cur = (cur as Error & { cause?: unknown }).cause; }
    else { msg = String(cur); break; }
  }
  return msg.slice(0, 250);
}

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const userPart = url.replace("postgresql://", "").split(":")[0] ?? "—";
  const env = {
    user_as_server_sees_it: userPart,
    user_ok: userPart.includes(".") ? "منقّط صحيح ✓" : "⚠️ ناقص — لازم postgres.rpymiqhanmlqfzpxzesy",
    url_shape: url.startsWith("postgresql://") ? "صيغة صحيحة ✓" : "⚠️ لا يبدأ بـ postgresql://",
    placeholder: url.includes("[YOUR-PASSWORD]") ? "⚠️ نسيت تبدّل [YOUR-PASSWORD]" : "الكلمة مبدّلة ✓",
    host: url.split("@")[1]?.split(":")[0] ?? "—",
    port: url.split(":").pop()?.split("/")[0] ?? "—",
  };
  const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    const r = await pool.query("SELECT count(*)::int n FROM products");
    await pool.end();
    return NextResponse.json({ db: "OK", products: r.rows[0].n, env });
  } catch (e) {
    await pool.end().catch(() => {});
    return NextResponse.json({ db: "FAIL", cause: rootMsg(e), env }, { status: 500 });
  }
}
