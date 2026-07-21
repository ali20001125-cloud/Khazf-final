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
  const url = process.env.KHAZF_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  const source = process.env.KHAZF_DATABASE_URL ? "KHAZF_DATABASE_URL" : "DATABASE_URL";
  const userPart = url.replace("postgresql://", "").split(":")[0] ?? "—";
  const env = {
    var_used: source,
    user_as_server_sees_it: userPart,
    user_ok: userPart.includes(".") ? "منقّط صحيح ✓" : "⚠️ ناقص — لازم postgres.rpymiqhanmlqfzpxzesy",
    url_shape: url.startsWith("postgresql://") ? "صيغة صحيحة ✓" : "⚠️ لا يبدأ بـ postgresql://",
    placeholder: url.includes("[YOUR-PASSWORD]") ? "⚠️ نسيت تبدّل [YOUR-PASSWORD]" : "الكلمة مبدّلة ✓",
    host: url.split("@")[1]?.split(":")[0] ?? "—",
    supabase_url_public: (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) ? "URL_OK" : "URL_MISSING",
    supabase_anon_public: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY) ? "ANON_OK" : "ANON_MISSING",
    google_login_ready: ((process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY)) ? "READY ✓" : "زر Google مخفي — مفاتيح ناقصة",
    smtp_host: process.env.SMTP_HOST ? "HOST_OK" : "HOST_MISSING",
    smtp_user: process.env.SMTP_USER ? "USER_OK" : "USER_MISSING",
    smtp_pass: process.env.SMTP_PASS ? "PASS_OK" : "PASS_MISSING",
    smtp_from: process.env.MAIL_FROM ? "FROM_OK" : "FROM_MISSING",
    smtp_admin: process.env.ADMIN_EMAIL ? "ADMIN_OK" : "ADMIN_MISSING",
    smtp_ready: (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? "EMAIL READY ✓" : "بريد غير مكتمل — تحقق من متغيرات هوستنجر",
    service_key: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SECRET_KEY || process.env.SERVICE_ROLE_KEY) ? "SERVICE_KEY_OK" : "SERVICE_KEY_MISSING",
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
