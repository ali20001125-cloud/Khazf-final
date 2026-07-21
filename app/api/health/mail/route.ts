import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/** اختبار إرسال حقيقي — /api/health/mail/?to=YOUR@EMAIL */
export async function GET(req: Request) {
  const to = new URL(req.url).searchParams.get("to");
  if (!to) return NextResponse.json({ error: "أضف ?to=إيميلك" }, { status: 400 });

  const host = process.env.SMTP_HOST, user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT ?? 465);
  if (!host || !user || !pass) return NextResponse.json({ error: "متغيرات SMTP ناقصة" }, { status: 400 });

  try {
    const t = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 12000, greetingTimeout: 12000,
    });
    await t.verify(); // يتحقق من الاتصال والمصادقة
    const info = await t.sendMail({
      from: process.env.MAIL_FROM ?? `خزف <${user}>`,
      to, subject: "اختبار بريد خزف ✓",
      html: "<div style='font-family:Tahoma;direction:rtl'>وصل هذا الإيميل — إعدادات البريد تعمل بنجاح ✓</div>",
    });
    return NextResponse.json({ ok: true, sent: info.messageId, accepted: info.accepted });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      code: (e as { code?: string })?.code ?? null,
    }, { status: 500 });
  }
}
