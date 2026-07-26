/**
 * اتصال قاعدة البيانات — خادم فقط (لا يُستورد من مكوّنات العميل)
 * DATABASE_URL: محلياً PostgreSQL 16 · إنتاجاً Supabase (نفس السطر، رابط مختلف)
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const url = process.env.KHAZF_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const needsSSL = url.includes("supabase.co") || url.includes("pooler.supabase.com");

const pool = new Pool({
  connectionString: url,
  max: 10,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined, // Supabase يفرض SSL
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

/**
 * حرج: مستمع أخطاء الـPool.
 * Supabase (وأي Postgres مُدار) يقطع الاتصالات الخاملة. بلا هذا المستمع،
 * يصبح خطأ الاتصال المقطوع "unhandled" فيُسقط عملية Node بالكامل —
 * وهذا يسبب حلقة إعادة تشغيل (503) على منصّات مثل هوستنجر.
 */
pool.on("error", (err) => {
  console.error("pg pool error (handled, non-fatal):", err?.message ?? err);
});

export const db = drizzle(pool, { schema });
export { schema };
export type DB = typeof db;
