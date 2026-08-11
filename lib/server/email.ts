/**
 * إشعارات الإيميل — تعمل فقط عند ضبط متغيرات SMTP (اختيارية):
 * SMTP_HOST · SMTP_PORT · SMTP_USER · SMTP_PASS · MAIL_FROM · ADMIN_EMAIL
 */
import nodemailer from "nodemailer";
import { db, schema as s } from "@/lib/server/db";
import { eq } from "drizzle-orm";

/** تنسيق الأرقام — لاتينية بفواصل */
const m = (n: number) => Number(n ?? 0).toLocaleString("en");

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

export async function sendMail(to: string, subject: string, html: string, kind = "other") {
  if (!configured() || !to) return;
  let ok = true;
  try {
    await transport().sendMail({
      from: process.env.MAIL_FROM ?? `خزف <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
  } catch (e) {
    ok = false;
    console.error("email:", e instanceof Error ? e.message : e);
  }
  // سجل الإرسال (لمراقبة الحد اليومي) — فشله لا يؤثر
  try {
    await db.insert(s.emailLog).values({ kind, recipient: to.slice(0, 160), ok });
  } catch { /* تجاهل */ }
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
      <p style="font-size:11px;color:#8a8577;margin-top:20px;line-height:1.85">خزف · نُحمّص بعناية، ونوصل إلى بابك في كل العراق<br/><span style="color:#a8a091">khazf.shop</span></p>
    </div>
  </div>
</div>`;

export async function emailNewOrderAdmin(o: {
  orderNumber: string; name: string; phone: string; governorate: string;
  total: number; invoiceUrl: string;
  address?: string | null; note?: string | null; email?: string | null;
  items?: { name: string; qty: number; line: number }[];
  itemsSubtotal?: number; journeyDiscount?: number; pointsUsed?: number;
  deliveryCharged?: number; giftName?: string | null; profit?: number | null;
  isNewCustomer?: boolean; ordersCount?: number;
}) {
  /* يصل بريد المتجر وبريدك الشخصي معاً */
  const admins = [process.env.ADMIN_EMAIL, process.env.SMTP_USER]
    .map((x) => x?.trim()).filter(Boolean) as string[];
  const admin = [...new Set(admins.map((x) => x.toLowerCase()))].join(", ");
  if (!admin) return;
  const logo = await getLogo();
  const site = process.env.SITE_URL ?? "https://khazf.shop";
  const intl = "964" + String(o.phone ?? "").replace(/[^0-9]/g, "").replace(/^0+/, "").replace(/^964/, "");

  const rows = (o.items ?? []).map((i) =>
    `<tr>
      <td style="padding:6px 0;font-size:13px">${i.name} <span style="color:#6e6459">×${i.qty}</span></td>
      <td style="padding:6px 0;font-size:13px;text-align:left" dir="ltr">${m(i.line)}</td>
    </tr>`).join("");

  const line = (label: string, value: string, color = "#6e6459") =>
    `<tr><td style="padding:3px 0;font-size:12.5px;color:#6e6459">${label}</td>
     <td style="padding:3px 0;font-size:12.5px;text-align:left;color:${color}" dir="ltr">${value}</td></tr>`;

  await sendMail(admin, `طلب جديد ${o.orderNumber} — ${m(o.total)} د.ع`, wrap(`
    <p style="font-size:16px;font-weight:bold;margin:0 0 4px">طلب جديد 🎉</p>
    <p style="font-size:13px;color:#6e6459;margin:0 0 14px">
      ${o.orderNumber}${o.isNewCustomer ? ' · <b style="color:#A66A4C">زبون جديد</b>' : o.ordersCount ? ` · طلبه رقم ${m(o.ordersCount)}` : ""}
    </p>

    <div style="background:#f4f1ea;border-radius:12px;padding:14px 16px;margin:0 0 14px">
      <p style="font-size:14px;font-weight:bold;margin:0 0 6px">${o.name}</p>
      <p style="font-size:13px;line-height:1.9;color:#6e6459;margin:0">
        <span dir="ltr">${o.phone}</span><br/>
        ${o.governorate}${o.address ? ` — ${o.address}` : ""}
        ${o.email ? `<br/><span dir="ltr">${o.email}</span>` : ""}
        ${o.note ? `<br/><b style="color:#A66A4C">ملاحظة:</b> ${o.note}` : ""}
      </p>
      <a href="https://wa.me/${intl}" style="display:inline-block;background:#25D366;color:#fff;padding:8px 18px;border-radius:8px;font-size:12.5px;font-weight:bold;text-decoration:none;margin-top:10px">واتساب الزبون</a>
    </div>

    ${rows ? `<table style="width:100%;border-collapse:collapse;margin:0 0 10px">${rows}</table>` : ""}

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #E4DDD0;padding-top:8px">
      ${o.itemsSubtotal != null ? line("المنتجات", m(o.itemsSubtotal)) : ""}
      ${o.journeyDiscount ? line("خصم الولاء", "−" + m(o.journeyDiscount), "#5b8a4e") : ""}
      ${o.pointsUsed ? line("كاش باك مستخدم", "−" + m(o.pointsUsed), "#5b8a4e") : ""}
      ${o.giftName ? line("هدية", o.giftName, "#c9a961") : ""}
      ${line("التوصيل", o.deliveryCharged === 0 ? "مجاني" : m(o.deliveryCharged ?? 0))}
      <tr><td style="padding:8px 0 0;font-size:15px;font-weight:bold;border-top:1px solid #E4DDD0">الإجمالي</td>
      <td style="padding:8px 0 0;font-size:15px;font-weight:bold;text-align:left;border-top:1px solid #E4DDD0" dir="ltr">${m(o.total)} د.ع</td></tr>
      ${o.profit != null ? `<tr><td style="padding:4px 0;font-size:12px;color:#6e6459">الربح التقديري</td><td style="padding:4px 0;font-size:12px;text-align:left;color:#5b8a4e" dir="ltr">${m(o.profit)} د.ع</td></tr>` : ""}
    </table>

    <div style="margin-top:16px">
      <a href="${o.invoiceUrl}" style="display:inline-block;background:#505445;color:#F4F1EA;padding:10px 22px;border-radius:10px;font-size:13px;text-decoration:none;margin-left:8px">الفاتورة</a>
      <a href="${site}/alikhazf25/orders/" style="display:inline-block;border:1px solid #E4DDD0;color:#332b24;padding:10px 22px;border-radius:10px;font-size:13px;text-decoration:none">اللوحة</a>
    </div>
  `, logo), "admin_order");
}

export async function emailOrderCustomer(o: {
  email: string | null; orderNumber: string; name: string; total: number; invoiceUrl: string;
  items?: { name: string; qty: number; line: number; image?: string | null }[];
  itemsSubtotal?: number; journeyDiscount?: number; pointsUsed?: number;
  deliveryCharged?: number; freeDelivery?: boolean;
  pointsEarned?: number; pointsBalanceAfter?: number;   // كاش باك هذا الطلب والرصيد المتبقي
  journeyOrders?: number; giftName?: string | null;      // موقع الزبون من رحلة الستّ طلبات
}) {
  if (!o.email) return;
  const logo = await getLogo();
  const rowsHtml = (o.items ?? []).map((i) =>
    `<tr>
      <td style="padding:8px 0;font-size:13px">
        <table style="border-collapse:collapse"><tr>
          ${i.image
            ? `<td style="padding:0 0 0 10px;width:46px"><img src="${i.image}" alt="" width="46" height="46" style="width:46px;height:46px;border-radius:9px;object-fit:cover;display:block;border:1px solid #E4DDD0" /></td>`
            : ""}
          <td style="font-size:13px">${i.name} <span style="color:#8A7F70">×${i.qty}</span></td>
        </tr></table>
      </td>
      <td style="padding:8px 0;font-size:13px;text-align:left;vertical-align:middle" dir="ltr">${m(i.line)} د.ع</td>
    </tr>`
  ).join("");
  const line = (label: string, val: string, color = "#1C1A18") =>
    `<tr><td style="padding:3px 0;font-size:12.5px;color:#6E655A">${label}</td><td style="padding:3px 0;font-size:12.5px;text-align:left;color:${color}" dir="ltr">${val}</td></tr>`;
  /* بطاقة المكافآت: كاش باك هذا الطلب + الرصيد + موقعه من رحلة الولاء */
  const rewardsCard = (() => {
    const parts: string[] = [];
    if (o.pointsEarned && o.pointsEarned > 0) {
      parts.push(`<p style="font-size:12.5px;line-height:1.9;margin:0 0 6px;color:#6b6459">
        يُضاف إلى رصيدك <b style="color:#A66A4C">${m(o.pointsEarned)} د.ع</b> كاش باك فور تأكيد توصيل طلبك${
          o.pointsBalanceAfter != null ? ` — ليصبح رصيدك <b style="color:#A66A4C">${m(o.pointsBalanceAfter)} د.ع</b>` : ""}.
      </p>`);
    } else if (o.pointsUsed) {
      parts.push(`<p style="font-size:12.5px;line-height:1.9;margin:0 0 6px;color:#6b6459">
        استخدمت <b style="color:#A66A4C">${m(o.pointsUsed)} د.ع</b> من رصيدك في هذا الطلب${
          o.pointsBalanceAfter != null ? ` — والمتبقي <b style="color:#A66A4C">${m(o.pointsBalanceAfter)} د.ع</b>` : ""}.
      </p>`);
    }
    if (o.giftName) {
      parts.push(`<p style="font-size:12.5px;line-height:1.9;margin:0 0 6px;color:#6b6459">
        🎁 مع هذا الطلب: <b style="color:#3d4230">${o.giftName}</b>
      </p>`);
    }
    if (o.journeyOrders != null) {
      const done = Math.min(6, Math.max(0, o.journeyOrders));
      const dots = Array.from({ length: 6 }, (_, i) =>
        `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;margin:0 2px;background:${i < done ? "#c9a961" : "#e0dcd3"}"></span>`
      ).join("");
      const left = 6 - done;
      parts.push(`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e2db">
        <p style="font-size:12px;font-weight:bold;color:#3d4230;margin:0 0 6px">رحلتك مع خزف</p>
        <div style="margin:0 0 6px">${dots}</div>
        <p style="font-size:12px;color:#6b6459;margin:0">${
          left > 0 ? `بقيت ${left === 1 ? "طلبية واحدة" : `${m(left)} طلبات`} ويصلك كيس قهوة مجاني`
                   : "أكملت رحلتك — كيس القهوة المجاني بانتظارك"}</p>
      </div>`);
    }
    if (parts.length === 0) return "";
    return `<div style="background:#f4f1ea;border-radius:12px;padding:14px 16px;margin-top:16px">${parts.join("")}</div>`;
  })();

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
    ${rewardsCard}
  `, logo), "order_confirm");
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
  `, logo), "review");
}

/** رسالة ترحيب لأول تسجيل */
export async function emailWelcome(o: { email: string | null; name: string }) {
  if (!o.email) return;
  const logo = await getLogo();
  const site = process.env.SITE_URL ?? "https://khazf.shop";
  await sendMail(o.email, `أهلاً بك في خزف 🤎`, wrap(`
    <p style="font-size:17px;font-weight:bold;margin:0 0 10px">أهلاً بك يا ${o.name} 🤎</p>
    <p style="font-size:13.5px;line-height:1.95;margin:0 0 14px">
      سعداء بانضمامك. عندنا القهوة ليست مشروباً عابراً — بل لحظة تستحق أن تُصنع بعناية،
      من اختيار المحصول إلى تحميصه وتوصيله إلى بابك.
    </p>
    <div style="background:#f4f1ea;border-radius:12px;padding:14px 16px;margin:0 0 16px">
      <p style="font-size:13px;font-weight:bold;color:#3d4230;margin:0 0 8px">ما ينتظرك مع كل طلب</p>
      <p style="font-size:12.5px;line-height:1.9;color:#6b6459;margin:0">
        توصيل مجاني للطلبات فوق ٩٠٬٠٠٠ د.ع<br/>
        ٣٪ كاش باك يعود إليك خصماً في طلبك القادم<br/>
        ورحلة من ستّ طلبات، في كل محطّة مكافأة — وفي نهايتها كيس قهوة مجاني
      </p>
    </div>
    <a href="${site}" style="display:inline-block;background:#A66A4C;color:#fff;padding:12px 30px;border-radius:10px;font-size:14.5px;font-weight:bold;text-decoration:none">ابدأ التسوق</a>
  `, logo), "welcome");
}

/** دليل التحضير — يُرسل لمن ترك بريده */
export async function emailBrewGuide(o: { email: string; guideUrl: string }) {
  if (!o.email) return;
  const logo = await getLogo();
  const site = process.env.SITE_URL ?? "https://khazf.shop";
  await sendMail(o.email, `دليل تحضير القهوة المختصة — خزف`, wrap(`
    <p style="font-size:16px;font-weight:bold;margin:0 0 10px">دليلك جاهز 🤎</p>
    <p style="font-size:13.5px;line-height:1.95;margin:0 0 14px">
      جمعنا لك النِّسب والخطوات التي نعتمدها في خزف — V60 والفرنش برس والإسبريسو،
      بالجرامات والوقت ودرجة الماء.
    </p>
    <div style="background:#f4f1ea;border-radius:12px;padding:14px 16px;margin:0 0 16px">
      <p style="font-size:12.5px;line-height:1.9;color:#6b6459;margin:0">
        القاعدة: نبدأ من ١:١٥ — ٢٠ غراماً من البن لكل ٣٠٠ مل ماء<br/>
        ماء بين ٩٠ و٩٣ درجة حسب الطريقة · طحن وسط للفلتر · ٢:٤٥ تقريباً على V60
      </p>
    </div>
    <a href="${o.guideUrl}" style="display:inline-block;background:#A66A4C;color:#fff;padding:12px 30px;border-radius:10px;font-size:14.5px;font-weight:bold;text-decoration:none">افتح الدليل كاملاً</a>
    <p style="font-size:12.5px;line-height:1.9;margin:16px 0 0;color:#6b6459">
      وإن أردت قهوة تليق بالدليل — <a href="${site}" style="color:#A66A4C;font-weight:bold;text-decoration:none">محاصيلنا هنا</a>.
    </p>
  `, logo), "guide");
}

/** إشعار عودة منتج نفد */
export async function emailRestock(o: { email: string; productName: string; url: string }) {
  if (!o.email) return;
  const logo = await getLogo();
  await sendMail(o.email, `${o.productName} عاد للمتجر — خزف`, wrap(`
    <p style="font-size:16px;font-weight:bold;margin:0 0 10px">${o.productName} عاد 🤎</p>
    <p style="font-size:13.5px;line-height:1.95;margin:0 0 16px">
      طلبت أن نُعلمك حين يعود — وها هو متوفّر الآن.
      الكميات محدودة كالعادة، فبادر إن كنت لا تزال مهتماً.
    </p>
    <a href="${o.url}" style="display:inline-block;background:#A66A4C;color:#fff;padding:12px 30px;border-radius:10px;font-size:14.5px;font-weight:bold;text-decoration:none">اطلبه الآن</a>
  `, logo), "restock");
}

/** وصفات محاصيله — تُرسل بعد يومين من التوصيل */
export async function emailBrewTips(o: {
  email: string | null; name: string;
  coffees: { name: string; notes: string[]; roast: string | null; brew: { name: string; nums: string }[] }[];
}) {
  if (!o.email || o.coffees.length === 0) return;
  const logo = await getLogo();
  const site = process.env.SITE_URL ?? "https://khazf.shop";

  const blocks = o.coffees.map((c) => `
    <div style="background:#f4f1ea;border-radius:12px;padding:14px 16px;margin:0 0 12px">
      <p style="font-size:14.5px;font-weight:bold;color:#3d4230;margin:0 0 4px">${c.name}</p>
      ${c.notes.length ? `<p style="font-size:12px;color:#A66A4C;margin:0 0 8px">${c.notes.join(" · ")}${c.roast ? ` · تحميص ${c.roast}` : ""}</p>` : ""}
      ${c.brew.map((b) => `<p style="font-size:12.5px;line-height:1.85;color:#6b6459;margin:0"><b style="color:#3d4230">${b.name}</b> — ${b.nums}</p>`).join("")}
    </div>`).join("");

  await sendMail(o.email, `كيف تحضّر محاصيلك — خزف`, wrap(`
    <p style="font-size:16px;font-weight:bold;margin:0 0 10px">وصلتك قهوتك يا ${o.name} 🤎</p>
    <p style="font-size:13.5px;line-height:1.95;margin:0 0 14px">
      جمعنا لك النِّسب التي نراها الأنسب لكل محصول طلبته — جرّبها كنقطة بداية، ثم اضبطها على ذوقك.
    </p>
    ${blocks}
    <p style="font-size:12.5px;line-height:1.9;margin:4px 0 14px;color:#6b6459">
      إن جاءت مرّة، خشّن الطحن قليلاً. وإن جاءت حامضة، نعّمه. التعديل بخطوة واحدة في كل مرة.
    </p>
    <a href="${site}/guide/" style="display:inline-block;background:#A66A4C;color:#fff;padding:12px 30px;border-radius:10px;font-size:14.5px;font-weight:bold;text-decoration:none">دليل التحضير كاملاً</a>
  `, logo), "brew_tips");
}

/** إعلان منتج جديد لقائمة البريد */
export async function emailNewProduct(o: {
  email: string; productName: string; url: string;
  image?: string | null; note?: string | null; price?: number | null;
}) {
  if (!o.email) return;
  const logo = await getLogo();
  await sendMail(o.email, `وصل حديثاً: ${o.productName} — خزف`, wrap(`
    <p style="font-size:12px;letter-spacing:2px;color:#A66A4C;margin:0 0 8px">وصل حديثاً</p>
    <p style="font-size:19px;font-weight:bold;margin:0 0 12px">${o.productName}</p>
    ${o.image ? `<img src="${o.image}" alt="${o.productName}" width="100%" style="width:100%;max-width:420px;border-radius:14px;display:block;margin:0 0 14px" />` : ""}
    ${o.note ? `<p style="font-size:13.5px;line-height:1.95;margin:0 0 14px">${o.note}</p>` : ""}
    ${o.price != null ? `<p style="font-size:16px;font-weight:bold;margin:0 0 14px">${m(o.price)} د.ع</p>` : ""}
    <a href="${o.url}" style="display:inline-block;background:#A66A4C;color:#fff;padding:12px 30px;border-radius:10px;font-size:14.5px;font-weight:bold;text-decoration:none">اطلبه الآن</a>
    <p style="font-size:11.5px;color:#8A7F70;margin:16px 0 0">
      وصلك هذا لأنك من قائمة خزف — نراسلك فقط حين يستحق.
    </p>
  `, logo), "announce");
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
    <div style="background:#f0f5ee;border:1px solid #cfe0c8;border-radius:11px;padding:12px 14px;text-align:center;margin-bottom:14px">
      <p style="font-size:13.5px;font-weight:bold;color:#3f6b34;margin:0">🚚 توصيل مجاني فوق ٩٠٬٠٠٠ د.ع</p>
      <p style="font-size:11.5px;color:#5b7a52;margin:4px 0 0">خصم يصل ٢٠٪ على البوكس · الدفع عند الاستلام</p>
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
    <div style="background:#f0f5ee;border:1px solid #cfe0c8;border-radius:11px;padding:12px 14px;text-align:center;margin-bottom:14px">
      <p style="font-size:13.5px;font-weight:bold;color:#3f6b34;margin:0">🚚 توصيل مجاني فوق ٩٠٬٠٠٠ د.ع</p>
      <p style="font-size:11.5px;color:#5b7a52;margin:4px 0 0">خصم يصل ٢٠٪ على البوكس · الدفع عند الاستلام</p>
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
    <div style="background:#f0f5ee;border:1px solid #cfe0c8;border-radius:11px;padding:12px 14px;text-align:center;margin-bottom:14px">
      <p style="font-size:13.5px;font-weight:bold;color:#3f6b34;margin:0">🚚 توصيل مجاني فوق ٩٠٬٠٠٠ د.ع</p>
      <p style="font-size:11.5px;color:#5b7a52;margin:4px 0 0">خصم يصل ٢٠٪ على البوكس · الدفع عند الاستلام</p>
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
  await sendMail(d.email, tpl.subject, html, `cart_${tpl.id}`);
  return tpl.id;
}
