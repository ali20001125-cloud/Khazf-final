/**
 * اتصال قاعدة البيانات — خادم فقط (لا يُستورد من مكوّنات العميل)
 * DATABASE_URL: محلياً PostgreSQL 16 · إنتاجاً Supabase (نفس السطر، رابط مختلف)
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";
const needsSSL = url.includes("supabase.co") || url.includes("pooler.supabase.com");

const pool = new Pool({
  connectionString: url,
  max: 10,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined, // Supabase يفرض SSL
});

export const db = drizzle(pool, { schema });
export { schema };
export type DB = typeof db;
