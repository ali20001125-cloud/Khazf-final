/**
 * إشعارات الإيميل — تعمل فقط عند ضبط متغيرات SMTP (اختيارية):
 * SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · MAIL_FROM · ADMIN_EMAIL
 */
import nodemailer from "nodemailer";
import { db, schema as s } from "@/lib/server/db";
import { eq } from "drizzle-orm";

/** يجيب رابط اللوغو من الإعدادات (للإيميلات) */
async function getLogo(): Promise<string | null> {
  try {
    const [row] = await db.select({ logoUrl: s.settings.logoUrl }).from(s.settings).where(eq(s.settings.id, 1));
    return row?.logoUrl ?? null;
  } catch { return null; }
}

const configured = () =>
  !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

function transport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!configured() || !to) return;
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM ?? `خزف <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
  } catch (e) {
    console.error("email:", e instanceof Error ? e.message : e);
  }
}

const wrap = (inner: string, logoUrl?: string | null) => `
<div style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial;direction:rtl;background:#e8e6e1;padding:10px 6px">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e0d5">
    <div style="background:#f4f1ea;padding:20px;text-align:center;border-bottom:2px solid #c9a961">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="خزف" style="display:block;height:40px;width:auto;object-fit:contain;margin:0 auto" />`
        : `<p style="font-family:Amiri,serif;font-size:26px;font-weight:bold;color:#a66a4c;margin:0">خزف</p>`}
      <div style="width:34px;height:1px;background:#c9a961;margin:11px auto 0"></div>
    </div>
    <div style="padding:22px 22px">
      ${inner}
      <p style="font-size:11px;color:#8a8577;margin-top:20px">خزف — قهوة مختصة، توصيل لكل العراق</p>
    </div>
  </div>
</div>`;

export async function emailNewOrderAdmin(o: { orderNumber: string; name: string; phone: string; governorate: string; total: number; invoiceUrl: string }) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;
  const logo = await getLogo();
  await sendMail(admin, `طلب جديد ${o.orderNumber} — ${o.total.toLocaleString("en")} د.ع`, wrap(`
    <p style="font-size:15px;font-weight:bold">طلب جديد وصل 🎉</p>
    <p style="font-size:13px;line-height:1.9">
      <b>${o.orderNumber}</b><br/>${o.name} — ${o.phone}<br/>${o.governorate}<br/>
      الإجمالي: <b>${o.total.toLocaleString("en")} د.ع</b>
    </p>
    <a href="${o.invoiceUrl}" style="display:inline-block;background:#505445;color:#F4F1EA;padding:10px 22px;border-radius:10px;font-size:13px;text-decoration:none">الفاتورة</a>
  `, logo));
}

export async function emailOrderCustomer(o: {
  email: string | null; orderNumber: string; name: string; total: number; invoiceUrl: string;
  items?: { name: string; qty: number; line: number }[];
  itemsSubtotal?: number; journeyDiscount?: number; pointsUsed?: number;
  deliveryCharged?: number; freeDelivery?: boolean;
}) {
  if (!o.email) return;
  const logo = await getLogo();
  const m = (n: number) => n.toLocaleString("en");
  const rowsHtml = (o.items ?? []).map((i) =>
    `<tr><td style="padding:6px 0;font-size:13px">${i.name} <span style="color:#8A7F70">×${i.qty}</span></td><td style="padding:6px 0;font-size:13px;text-align:left" dir="ltr">${m(i.line)} د.ع</td></tr>`
  ).join("");
  const line = (label: string, val: string, color = "#1C1A18") =>
    `<tr><td style="padding:3px 0;font-size:12.5px;color:#6E655A">${label}</td><td style="padding:3px 0;font-size:12.5px;text-align:left;color:${color}" dir="ltr">${val}</td></tr>`;
  await sendMail(o.email, `تم استلام طلبك ${o.orderNumber} — خزف`, wrap(`
    <p style="font-size:15px;font-weight:bold">شكراً ${o.name}!</p>
    <p style="font-size:13px;line-height:1.9">استلمنا طلبك <b>${o.orderNumber}</b> والتوصيل خلال ١–٢ يوم عمل.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid #E4DDD0">
      ${rowsHtml}
    </table>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E4DDD0;padding-top:8px">
      ${o.itemsSubtotal != null ? line("المنتجات", m(o.itemsSubtotal) + " د.ع") : ""}
      ${o.journeyDiscount ? line("خصم الولاء", "−" + m(o.journeyDiscount) + " د.ع", "#3D8A4C") : ""}
      ${o.pointsUsed ? line("الكاش باك المستخدم", "−" + m(o.pointsUsed) + " د.ع", "#A66A4C") : ""}
      ${line("التوصيل", o.freeDelivery ? "مجّاني" : m(o.deliveryCharged ?? 0) + " د.ع")}
    </table>
    <table style="width:100%;border-collapse:collapse;border-top:2px solid #1C1A18;margin-top:8px">
      <tr><td style="padding:10px 0;font-size:15px;font-weight:bold">الإجمالي (كاش عند الاستلام)</td><td style="padding:10px 0;font-size:17px;font-weight:bold;text-align:left;color:#A66A4C" dir="ltr">${m(o.total)} د.ع</td></tr>
    </table>
    <a href="${o.invoiceUrl}" style="display:inline-block;background:#505445;color:#F4F1EA;padding:10px 22px;border-radius:10px;font-size:13px;text-decoration:none;margin-top:6px">عرض الفاتورة على الموقع</a>
  `, logo));
}

export async function emailReviewRequest(o: { email: string | null; name: string; orderNumber: string; reviewUrl: string }) {
  if (!o.email) return;
  const logo = await getLogo();
  await sendMail(o.email, `وصل طلبك ${o.orderNumber} — كيف كانت تجربتك؟`, wrap(`
    <p style="font-size:15px;font-weight:bold">وصل طلبك يا ${o.name} 🤎</p>
    <p style="font-size:13px;line-height:1.9">
      نتمنّى أن تكون محاصيلك أعجبتك. رأيك يصنع فرقاً حقيقياً لخزف —<br/>
      قيّم محاصيلك والتوصيل بدقيقة واحدة:
    </p>
    <a href="${o.reviewUrl}" style="display:inline-block;background:#A66A4C;color:#fff;padding:11px 26px;border-radius:10px;font-size:14px;font-weight:bold;text-decoration:none">قيّم تجربتك</a>
    <p style="font-size:11px;color:#8A7F70;margin-top:14px">أو انسخ الرابط: ${o.reviewUrl}</p>
  `, logo));
}

/* ═══════════════ تذكير السلة المتروكة ═══════════════ */

type CartItem = { name: string; qty: number; price: number };
type ReminderData = {
  email: string; name: string | null; items: CartItem[]; total: number;
  cartUrl: string; logoUrl?: string | null; whatsapp?: string | null;
  reviews?: Record<string, { rating: number; comment?: string; author?: string }>;
};

const iqd = (n: number) => n.toLocaleString("en");

/** رأس الإيميل: لوغو إن وُجد، وإلا "خزف" نصياً */
function brandHead(logoUrl?: string | null, tagline?: string) {
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="خزف" style="display:block;height:42px;width:auto;object-fit:contain;margin:0 auto" />`
    : `<p style="font-family:Amiri,serif;color:#a66a4c;font-size:28px;font-weight:700;margin:0">خزف</p>`;
  return `<div style="background:#f4f1ea;padding:22px 30px;text-align:center;border-bottom:2px solid #c9a961">
    ${logo}
    <div style="width:34px;height:1px;background:#c9a961;margin:11px auto 0"></div>
  </div>`;
}

/** بطاقة منتج (مع تقييم اختياري) */
function itemRow(it: CartItem, review?: { rating: number; comment?: string; author?: string }, style: "plain" | "boxed" = "plain") {
  const stars = review ? "★".repeat(Math.round(review.rating)) + "☆".repeat(5 - Math.round(review.rating)) : "";
  const social = review
    ? (review.comment
        ? `<div style="background:#faf6ed;border-radius:6px;padding:5px 8px;margin-top:5px"><p style="font-size:11.5px;color:#a66a4c;margin:0">${stars} «${review.comment}»${review.author ? ` — ${review.author}` : ""}</p></div>`
        : `<p style="font-size:12px;color:#c9a961;margin:4px 0 0">${stars}</p>`)
    : "";
  const wrapS = style === "boxed"
    ? "background:#fff;border-radius:10px;margin-bottom:6px"
    : "border-bottom:1px solid #e5e2db";
  return `<div style="display:flex;align-items:center;gap:14px;padding:14px;${wrapS}">
    <div style="width:60px;height:60px;background:#efe9de;border-radius:10px;flex-shrink:0"></div>
    <div style="flex:1">
      <p style="font-size:15px;font-weight:700;color:#332b24;margin:0">${it.name}</p>
      ${social}
      <p style="font-size:12px;color:#8a8377;margin:3px 0 0">الكمية ${it.qty}</p>
    </div>
    <p style="font-size:14px;font-weight:700;color:#332b24;margin:0;white-space:nowrap">${iqd(it.price)}</p>
  </div>`;
}

function waBtn(whatsapp?: string | null) {
  const num = (whatsapp || "9647881554987").replace(/[^0-9]/g, "");
  return `<a href="https://wa.me/${num}" style="display:inline-block;background:#505445;color:#faf7f0;padding:9px 20px;border-radius:9px;font-size:12.5px;font-weight:700;text-decoration:none">واتساب</a>`;
}

/** القالب ١: الدافئ الأنيق — "قهوتك تنتظر" */
function tpl1(d: ReminderData) {
  return brandHead(d.logoUrl, "قهوة مختصة") + `
  <div style="padding:26px 30px">
    <h1 style="font-size:23px;color:#332b24;margin:0 0 8px">قهوتك تنتظر${d.name ? "، " + d.name : ""}</h1>
    <p style="font-size:15px;color:#6b6459;line-height:1.8;margin:0 0 24px">تركت بعض المنتجات المختارة في سلتك — لا تزال بانتظارك متى شئت.</p>
    <div style="border:1px solid #e5e2db;border-radius:14px;overflow:hidden;margin-bottom:26px">
      ${d.items.map((it) => itemRow(it, d.reviews?.[it.name])).join("")}
    </div>
    <a href="${d.cartUrl}" style="display:block;background:#a66a4c;color:#fff;text-align:center;padding:17px;border-radius:13px;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:14px">أكمل طلبك</a>
    <p style="text-align:center;font-size:13px;color:#8a8377;margin:0 0 26px">مع أول طلب، تبدأ رحلتك مع خزف — ونقاط تُجمع، ومكافآت بانتظارك.</p>
    <div style="border-top:1px solid #e5e2db;padding-top:22px;text-align:center">
      <p style="font-size:14px;color:#6b6459;margin:0 0 14px">عندك سؤال عن المحصول أو طريقة التحضير؟</p>
      ${waBtn(d.whatsapp)}
    </div>
  </div>
  <div style="background:#f7f6f3;padding:18px;text-align:center"><p style="font-size:11px;color:#a8a091;margin:0">خزف · khazf.shop</p></div>`;
}

/** القالب ٢: الغني الدافئ — "نسيتَ فنجانك؟" */
function tpl2(d: ReminderData) {
  return `<div style="background:#f4f1ea;padding:22px 30px;text-align:center;border-bottom:2px solid #c9a961">
    ${d.logoUrl ? `<img src="${d.logoUrl}" alt="خزف" style="display:block;height:42px;width:auto;object-fit:contain;margin:0 auto" />` : `<p style="font-family:Amiri,serif;color:#a66a4c;font-size:28px;font-weight:700;margin:0">خزف</p>`}
    <p style="font-family:Amiri,serif;color:#a66a4c;font-size:15px;margin:10px 0 0">نسيتَ فنجانك؟</p>
    <div style="width:34px;height:1px;background:#c9a961;margin:10px auto 0"></div>
  </div>
  <div style="padding:26px 30px">
    <h1 style="font-size:22px;color:#332b24;margin:0 0 8px">قهوتك تنتظر${d.name ? "، " + d.name : ""}</h1>
    <p style="font-size:14px;color:#6b6459;line-height:1.8;margin:0 0 22px">اخترت بعناية — واخترت جيداً. منتجاتك محفوظة، ولحظة التوقّف على بعد نقرة.</p>
    <div style="background:#f7f6f3;border-radius:14px;padding:6px;margin-bottom:22px">
      ${d.items.map((it) => itemRow(it, d.reviews?.[it.name], "boxed")).join("")}
    </div>
    <a href="${d.cartUrl}" style="display:block;background:#a66a4c;color:#fff;text-align:center;padding:17px;border-radius:12px;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:10px">أكمل طلبك</a>
    <p style="text-align:center;font-size:12.5px;color:#8a8377;margin:0 0 24px">ومع طلبك، تبدأ رحلة — نقاط، ومكافآت، وهدية تنتظرك في نهايتها.</p>
    <div style="background:#505445;border-radius:14px;padding:20px;text-align:center">
      <p style="font-size:14px;color:#faf7f0;margin:0 0 14px">سؤال عن المحصول أو طريقة التحضير؟ راسلنا</p>
      ${waBtn(d.whatsapp)}
    </div>
  </div>
  <div style="background:#3d4230;padding:18px;text-align:center"><p style="font-size:11px;color:rgba(250,247,240,.6);margin:0">خزف · khazf.shop</p></div>`;
}

/** القالب ٣: الكريمي الذهبي — "سلّتك ما زالت دافئة" */
function tpl3(d: ReminderData) {
  return `<div style="background:#f4f1ea;padding:22px 30px;text-align:center;border-bottom:2px solid #c9a961">
    ${d.logoUrl ? `<img src="${d.logoUrl}" alt="خزف" style="display:block;height:42px;width:auto;object-fit:contain;margin:0 auto" />` : `<p style="font-family:Amiri,serif;color:#a66a4c;font-size:28px;font-weight:700;margin:0">خزف</p>`}
    <div style="width:34px;height:1px;background:#c9a961;margin:10px auto 0"></div>
    <p style="color:#a66a4c;font-size:12px;margin:10px 0 0;letter-spacing:2px">سلّتك ما زالت دافئة</p>
  </div>
  <div style="padding:26px 30px">
    <p style="font-size:15px;color:#6b6459;line-height:1.9;margin:0 0 26px;text-align:center">أهلاً${d.name ? " " + d.name : ""} — اخترتَ ما يستحق التوقّف عنده.<br>منتجاتك محفوظة بانتظار عودتك.</p>
    <div style="margin-bottom:24px">
      ${d.items.map((it) => `<div style="border:1px solid #e5e2db;border-radius:14px;padding:14px;display:flex;align-items:center;gap:14px;margin-bottom:12px">
        <div style="width:64px;height:64px;background:#efe9de;border-radius:11px;flex-shrink:0"></div>
        <div style="flex:1"><p style="font-size:15px;font-weight:700;color:#332b24;margin:0">${it.name}</p>
        ${d.reviews?.[it.name] ? `<p style="font-size:12px;color:#c9a961;margin:4px 0 0">${"★".repeat(Math.round(d.reviews[it.name].rating))}</p>` : ""}
        <p style="font-size:12px;color:#8a8377;margin:4px 0 0">الكمية ${it.qty}</p></div>
        <p style="font-size:15px;font-weight:700;color:#332b24;margin:0;white-space:nowrap">${iqd(it.price)}</p>
      </div>`).join("")}
    </div>
    <a href="${d.cartUrl}" style="display:block;background:#c9a961;color:#3d4230;text-align:center;padding:17px;border-radius:13px;font-size:17px;font-weight:700;text-decoration:none;margin-bottom:12px">أكمل طلبك</a>
    <p style="text-align:center;font-size:12.5px;color:#8a8377;margin:0 0 28px;line-height:1.7">رشفتك الأولى تبدأ رحلة — ومع كل طلب، مكافأة تقترب.</p>
    <div style="width:30px;height:1px;background:#c9a961;margin:0 auto 22px"></div>
    <p style="text-align:center;font-size:14px;color:#6b6459;margin:0 0 16px">سؤال عن المحصول أو طريقة التحضير؟<br>يسعدنا أن نرشدك.</p>
    <div style="text-align:center">${waBtn(d.whatsapp)}</div>
  </div>
  <div style="background:#3d4230;padding:20px;text-align:center"><p style="font-family:Amiri,serif;color:#c9a961;font-size:16px;margin:0 0 4px">خزف</p><p style="font-size:11px;color:rgba(250,247,240,.6);margin:0">قهوة مختصة · khazf.shop</p></div>`;
}

const templates = [
  { id: "1", subject: "قهوتك تنتظر — أكمل طلبك من خزف", build: tpl1 },
  { id: "2", subject: "نسيتَ فنجانك؟ — سلتك محفوظة في خزف", build: tpl2 },
  { id: "3", subject: "سلّتك ما زالت دافئة — خزف", build: tpl3 },
];

/** يرسل تذكير السلة بقالب محدّد (بالتناوب) ويرجّع معرّف القالب المُرسل */
export async function emailCartReminder(d: ReminderData, templateIndex: number): Promise<string | null> {
  if (!d.email) return null;
  const tpl = templates[templateIndex % templates.length];
  const html = `<div style="font-family:'IBM Plex Sans Arabic',Tahoma,Arial;direction:rtl;background:#e8e6e1;padding:10px 6px">
    <div style="max-width:600px;margin:auto;background:#fdfcfa;border-radius:14px;overflow:hidden">${tpl.build(d)}</div>
  </div>`;
  await sendMail(d.email, tpl.subject, html);
  return tpl.id;
}
