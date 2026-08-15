import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/server/db";
import { notifyTelegram } from "@/lib/server/telegram";
import { sendMail, ownerEmail } from "@/lib/server/email";
import { askGemini, geminiConfigured } from "@/lib/server/gemini";
import { buildSnapshot } from "@/lib/server/snapshot";
import { assistantSystem, DAILY_PROMPT } from "@/lib/server/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const escHtml = (t: string) => t.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));

/** تحويل رد Gemini (ماركداون بسيط) إلى HTML للإيميل */
function aiToHtml(t: string): string {
  return t.split("\n").map((line) => {
    const s0 = escHtml(line.trim());
    if (!s0) return "";
    const clean = s0.replace(/^\s*[#*\-–•]+\s*/, "").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    const bullet = /^\s*[*\-–•]\s/.test(line) || /^[١٢٣٤٥٦٧٨٩0-9]+[).]/.test(s0);
    return `<p style="margin:5px 0;line-height:1.75;color:#444;font-size:13.5px">${bullet ? "• " : ""}${clean}</p>`;
  }).join("");
}
/** نسخة نصّية للتيليجرام */
const aiToPlain = (t: string) => escHtml(t.replace(/\*\*/g, "").replace(/^\s*#+\s*/gm, "").trim());

/**
 * ملخّص يومي بالتيليجرام.
 * يُستدعى من Cron Job بهوستنجر مرة يومياً:
 *   GET https://khazf.shop/api/cron/daily?key=CRON_SECRET
 * محمي بمفتاح سرّي (CRON_SECRET بمتغيرات البيئة).
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  // منع التكرار بنفس اليوم
  const dup = await db.execute(sql`SELECT 1 FROM daily_digests WHERE digest_date = ${today} LIMIT 1`);
  if ((dup.rowCount ?? 0) > 0) return NextResponse.json({ ok: true, skipped: "أُرسل اليوم" });

  const m = (n: number) => n.toLocaleString("en");

  // أرقام آخر ٢٤ ساعة
  const stats = (await db.execute(sql`
    SELECT
      (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= now() - interval '1 day')::int AS visitors,
      (SELECT COUNT(*) FROM page_views WHERE created_at >= now() - interval '1 day')::int AS views,
      (SELECT COUNT(*) FROM orders WHERE is_test = false AND created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS orders,
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE is_test = false AND created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS revenue,
      (SELECT COALESCE(SUM(product_profit),0) FROM orders WHERE is_test = false AND created_at >= now() - interval '1 day' AND status <> 'CANCELLED')::int AS profit,
      (SELECT COUNT(*) FROM abandoned_carts WHERE (email IS NULL OR lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')) AND (phone IS NULL OR phone NOT IN (SELECT value FROM test_identities WHERE kind='phone')) AND recovered = false AND updated_at < now() - interval '1 hour' AND updated_at >= now() - interval '1 day')::int AS abandoned,
      (SELECT COUNT(*) FROM auth.users WHERE created_at >= now() - interval '1 day')::int AS new_accounts,
      (SELECT COUNT(*) FROM email_log WHERE created_at >= now() - interval '1 day')::int AS emails_today,
      (SELECT COALESCE(SUM(items_total),0) FROM abandoned_carts WHERE (email IS NULL OR lower(email) NOT IN (SELECT lower(value) FROM test_identities WHERE kind='email')) AND (phone IS NULL OR phone NOT IN (SELECT value FROM test_identities WHERE kind='phone')) AND recovered = false AND updated_at < now() - interval '1 hour' AND updated_at >= now() - interval '1 day')::int AS abandoned_value,
      (SELECT COUNT(*) FROM customers WHERE created_at >= now() - interval '1 day')::int AS new_customers
  `)).rows[0] as unknown as {
    visitors: number; views: number; orders: number; revenue: number;
    profit: number; abandoned: number; abandoned_value: number; new_customers: number;
    new_accounts: number; emails_today: number;
  };

  // أكثر منتج مبيعاً أمس
  const topProduct = (await db.execute(sql`
    SELECT oi.name_snapshot AS name, SUM(oi.qty)::int AS qty
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= now() - interval '1 day' AND o.status <> 'CANCELLED'
    GROUP BY oi.name_snapshot ORDER BY qty DESC LIMIT 1`)).rows[0] as unknown as { name: string; qty: number } | undefined;

  const conv = stats.visitors > 0 ? ((stats.orders / stats.visitors) * 100).toFixed(1) : "0";

  const numbers =
    `👥 الزوار: <b>${m(stats.visitors)}</b> (${m(stats.views)} مشاهدة)\n` +
    `🛒 الطلبات: <b>${m(stats.orders)}</b>\n` +
    `💰 المبيعات: <b>${m(stats.revenue)} د.ع</b>\n` +
    `📈 الربح: <b>${m(stats.profit)} د.ع</b>\n` +
    `🎯 التحويل: <b>${conv}٪</b>\n` +
    `🆕 عملاء جدد (طلبوا): <b>${m(stats.new_customers)}</b>\n` +
    `📝 حسابات جديدة: <b>${m(stats.new_accounts)}</b>\n` +
    `✉️ بريد اليوم: <b>${m(stats.emails_today)}</b>/100${stats.emails_today >= 80 ? " ⚠️" : ""}\n` +
    (topProduct ? `⭐ الأكثر مبيعاً: <b>${topProduct.name}</b> (${topProduct.qty})\n` : "") +
    `━━━━━━━━━━━━\n` +
    `🔔 سلات مهجورة: <b>${m(stats.abandoned)}</b>` +
    (stats.abandoned_value > 0 ? ` (${m(stats.abandoned_value)} د.ع معلّقة)` : "");

  /* تحليل ذكي (ملاحظات + حلول) من المساعد — اختياري، لا يوقف الإرسال لو تعذّر */
  let ai = "";
  if (geminiConfigured()) {
    try {
      const r = await askGemini(assistantSystem(await buildSnapshot()), [{ role: "user", text: DAILY_PROMPT }]);
      if (r.ok) ai = r.text;
    } catch { /* تجاهل — نرسل الأرقام بلا تحليل */ }
  }

  const text =
    `📊 <b>ملخّص خزف اليومي</b>\n${today}\n━━━━━━━━━━━━\n` + numbers +
    (ai ? `\n━━━━━━━━━━━━\n🧠 <b>ملاحظات وحلول</b>\n${aiToPlain(ai)}` : "");

  const html = `
<div style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial;direction:rtl;background:#f4f1ea;padding:16px 8px">
  <div style="max-width:600px;margin:auto;background:#fff;border:1px solid #e5e0d5;border-radius:14px;overflow:hidden">
    <div style="background:#3b3a36;padding:18px 20px">
      <p style="margin:0;font-size:18px;font-weight:bold;color:#fff">☕ ملخّص خزف اليومي</p>
      <p style="margin:5px 0 0;font-size:12px;color:#c9a961">${today}</p>
    </div>
    <div style="padding:18px 20px">
      <p style="margin:0 0 8px;font-weight:bold;font-size:14px;color:#3b3a36">أرقام آخر ٢٤ ساعة</p>
      <div style="font-size:13.5px;line-height:2;color:#444">
        👥 الزوار: <b>${m(stats.visitors)}</b> (${m(stats.views)} مشاهدة)<br>
        🛒 الطلبات: <b>${m(stats.orders)}</b> · 🎯 التحويل: <b>${conv}٪</b><br>
        💰 المبيعات: <b>${m(stats.revenue)} د.ع</b> · 📈 الربح: <b>${m(stats.profit)} د.ع</b><br>
        🆕 عملاء جدد: <b>${m(stats.new_customers)}</b> · 📝 حسابات: <b>${m(stats.new_accounts)}</b><br>
        ${topProduct ? `⭐ الأكثر مبيعاً: <b>${escHtml(topProduct.name)}</b> (${topProduct.qty})<br>` : ""}
        🔔 سلات مهجورة: <b>${m(stats.abandoned)}</b>${stats.abandoned_value > 0 ? ` (${m(stats.abandoned_value)} د.ع معلّقة)` : ""}
      </div>
      ${ai ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid #eee">
        <p style="margin:0 0 8px;font-weight:bold;font-size:14px;color:#3b3a36">🧠 ملاحظات وحلول</p>${aiToHtml(ai)}
      </div>` : ""}
    </div>
  </div>
</div>`;

  const [tg, email] = await Promise.all([
    notifyTelegram(text),
    (async () => { const to = await ownerEmail(); return to ? sendMail(to, `☕ ملخّص خزف اليومي — ${today}`, html, "daily_report") : false; })(),
  ]);

  if (tg || email) {
    await db.insert(s.dailyDigests).values({ digestDate: today });
    return NextResponse.json({ ok: true, telegram: tg, email });
  }
  return NextResponse.json({ ok: false, sent: false, reason: "لم يُضبط تيليجرام ولا بريد المالك (SMTP + ADMIN_EMAIL)" }, { status: 502 });
}
