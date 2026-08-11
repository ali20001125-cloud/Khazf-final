import { NextResponse } from "next/server";
import { sendMail } from "@/lib/server/email";
import { notifyTelegram } from "@/lib/server/telegram";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // نموذج التواصل يرسل بريداً وتيليجرام — نمنع الإغراق (٦ رسائل كل ٥ دقائق لكل IP)
    if (!rateLimit(`contact:${clientIp(req)}`, 6, 300_000))
      return NextResponse.json({ error: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة" }, { status: 429 });
    const b = await req.json();
    const name = String(b.name ?? "").trim().slice(0, 80);
    const contact = String(b.contact ?? "").trim().slice(0, 120);
    const message = String(b.message ?? "").trim().slice(0, 2000);

    if (!message || message.length < 5)
      return NextResponse.json({ error: "اكتب رسالتك" }, { status: 400 });

    const esc = (t: string) => t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const admin = process.env.ADMIN_EMAIL;

    /* بريد لعلي */
    if (admin) {
      await sendMail(admin, `رسالة من ${name || "زائر"} — خزف`, `
        <p style="font-size:15px;font-weight:bold">رسالة جديدة من الموقع</p>
        <p style="font-size:13px;line-height:1.9">
          <b>${esc(name) || "بلا اسم"}</b><br/>
          ${contact ? `تواصل: <span dir="ltr">${esc(contact)}</span><br/>` : ""}
        </p>
        <div style="background:#f4f1ea;border-radius:6px;padding:14px;font-size:13.5px;line-height:1.9;white-space:pre-line">${esc(message)}</div>
      `, "contact").catch(() => {});
    }

    /* تيليجرام */
    const wa = contact.replace(/[^0-9]/g, "");
    const waLink = wa.length >= 10
      ? `\n\n💬 ردّ: https://wa.me/964${wa.replace(/^0+/, "").replace(/^964/, "")}`
      : "";
    await notifyTelegram(
      `✉️ <b>رسالة من الموقع</b>\n\n` +
      `👤 ${esc(name) || "بلا اسم"}\n` +
      (contact ? `📞 <code>${esc(contact)}</code>\n` : "") +
      `\n${esc(message)}${waLink}`
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر الإرسال" }, { status: 500 });
  }
}
