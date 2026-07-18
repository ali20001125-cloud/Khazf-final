/**
 * اتصال قاعدة البيانات — خادم فقط (لا يُستورد من مكوّنات العميل)
 * DATABASE_URL: محلياً PostgreSQL 16 · إنتاجاً Supabase (نفس السطر، رابط مختلف)
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };
export type DB = typeof db;
