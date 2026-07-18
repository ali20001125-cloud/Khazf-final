/** مُشغّل الهجرات: ينفّذ ملفات drizzle/*.sql بالترتيب، كلٌّ داخل Transaction، ويتتبعها */
import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`
    );
    const files = readdirSync("drizzle").filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const done = await client.query(`SELECT 1 FROM _migrations WHERE name=$1`, [f]);
      if (done.rowCount) { console.log(`↷ ${f} (مطبَّقة)`); continue; }
      const sql = readFileSync(join("drizzle", f), "utf8");
      // drizzle يفصل الجمل بـ statement-breakpoint
      const stmts = sql.split("--> statement-breakpoint");
      await client.query("BEGIN");
      try {
        for (const s of stmts) if (s.trim()) await client.query(s);
        await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [f]);
        await client.query("COMMIT");
        console.log(`✓ ${f}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((e) => { console.error("✗ فشل الهجرة:", e.message); process.exit(1); });
