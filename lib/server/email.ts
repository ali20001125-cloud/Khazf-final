/**
 * إشعارات الإيميل — تعمل فقط عند ضبط متغيرات SMTP (اختيارية):
 * SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · MAIL_FROM · ADMIN_EMAIL
 */
import nodemailer from "nodemailer";

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

const wrap = (inner: string) => `
<div style="font-family:Tahoma,Arial;direction:rtl;background:#F4F1EA;padding:28px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:18px;padding:28px;border:1px solid #e5e0d5">
    <p style="font-size:22px;font-weight:bold;margin:0 0 4px">خزف</p>
    <p style="font-size:10px;letter-spacing:3px;color:#8a8577;margin:0 0 20px">SPECIALTY COFFEE</p>
    ${inner}
    <p style="font-size:11px;color:#8a8577;margin-top:24px">خزف — قهوة مختصة، توصيل لكل العراق</p>
  </div>
</div>`;

export async function emailNewOrderAdmin(o: { orderNumber: string; name: string; phone: string; governorate: string; total: number; invoiceUrl: string }) {
  const admin = process.env.ADMIN_EMAIL;
  if (!admin) return;
  await sendMail(admin, `طلب جديد ${o.orderNumber} — ${o.total.toLocaleString("en")} د.ع`, wrap(`
    <p style="font-size:15px;font-weight:bold">طلب جديد وصل 🎉</p>
    <p style="font-size:13px;line-height:1.9">
      <b>${o.orderNumber}</b><br/>${o.name} — ${o.phone}<br/>${o.governorate}<br/>
      الإجمالي: <b>${o.total.toLocaleString("en")} د.ع</b>
    </p>
    <a href="${o.invoiceUrl}" style="display:inline-block;background:#505445;color:#F4F1EA;padding:10px 22px;border-radius:10px;font-size:13px;text-decoration:none">الفاتورة</a>
  `));
}

export async function emailOrderCustomer(o: {
  email: string | null; orderNumber: string; name: string; total: number; invoiceUrl: string;
  items?: { name: string; qty: number; line: number }[];
  itemsSubtotal?: number; journeyDiscount?: number; pointsUsed?: number;
  deliveryCharged?: number; freeDelivery?: boolean;
}) {
  if (!o.email) return;
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
  `));
}

export async function emailReviewRequest(o: { email: string | null; name: string; orderNumber: string; reviewUrl: string }) {
  if (!o.email) return;
  await sendMail(o.email, `وصل طلبك ${o.orderNumber} — كيف كانت تجربتك؟`, wrap(`
    <p style="font-size:15px;font-weight:bold">وصل طلبك يا ${o.name} 🤎</p>
    <p style="font-size:13px;line-height:1.9">
      نتمنّى أن تكون محاصيلك أعجبتك. رأيك يصنع فرقاً حقيقياً لخزف —<br/>
      قيّم محاصيلك والتوصيل بدقيقة واحدة:
    </p>
    <a href="${o.reviewUrl}" style="display:inline-block;background:#A66A4C;color:#fff;padding:11px 26px;border-radius:10px;font-size:14px;font-weight:bold;text-decoration:none">قيّم تجربتك</a>
    <p style="font-size:11px;color:#8A7F70;margin-top:14px">أو انسخ الرابط: ${o.reviewUrl}</p>
  `));
}
