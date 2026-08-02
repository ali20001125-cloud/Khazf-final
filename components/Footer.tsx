import Link from "next/link";
import { Instagram, Truck, HandCoins, Flame } from "lucide-react";

const cols = [
  {
    title: "روابط سريعة",
    links: [
      { href: "/products/", label: "المتجر" },
      { href: "/box/", label: "بناء البوكس" },
      { href: "/offers/", label: "العروض" },
      { href: "/start/", label: "ابدأ من هنا" },
      { href: "/about/", label: "من نحن" },
    ],
  },
  {
    title: "خدمة العملاء",
    links: [
      { href: "/contact/", label: "تواصل معنا" },
      { href: "/track/", label: "تتبع طلبك" },
      { href: "/guide/", label: "دليل التحضير" },
      { href: "/faq/", label: "الأسئلة الشائعة" },
      { href: "/cashback/", label: "الكاش باك" },
      { href: "/account/", label: "حسابي" },
    ],
  },
  {
    title: "Coffee Journal",
    links: [
      { href: "/journal/", label: "المقالات" },
      { href: "/recipes/", label: "الوصفات" },
      { href: "/recipes/", label: "الوصفات (مؤقت حي)" },
      { href: "/journal/?a=grind-guide", label: "دليل الطحن" },
      { href: "/journal/?a=tools-guide", label: "دليل الأدوات" },
    ],
  },
  {
    title: "السياسات",
    links: [
      { href: "/shipping/", label: "سياسة الشحن" },
      { href: "/returns/", label: "سياسة الاسترجاع" },
      { href: "/faq/", label: "الشروط والأسئلة" },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ background: "var(--deep)" }} className="text-olive-text">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-10 md:px-8 md:pt-14">

        {/* الأقسام — مطوية على الهاتف، مفتوحة على الشاشات الكبيرة */}
        <div className="md:hidden">
          {cols.map((c) => (
            <details key={c.title} className="border-b border-olive-text/12">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-[13.5px] font-bold">
                {c.title}
                <span className="text-[17px] font-normal opacity-50">+</span>
              </summary>
              <ul className="flex flex-col gap-2.5 pb-4 text-[12.5px] opacity-70">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="transition-opacity hover:text-gold hover:opacity-100">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="hidden gap-x-6 gap-y-10 md:grid md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <p className="text-3xl font-bold">خزف</p>
            <a href="https://instagram.com/khazf.roaster" target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[13px] opacity-70 transition-opacity hover:opacity-100">
              <Instagram size={15} /> khazf.roaster
            </a>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 text-[13px] font-bold text-gold">{c.title}</h4>
              <ul className="space-y-2.5 text-[13px] opacity-75">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="transition-opacity hover:text-gold hover:opacity-100">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* الطمأنة + التواصل */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-olive-text/12 pt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] opacity-60">
            <span className="flex items-center gap-1.5"><Truck size={13} /> توصيل لكل المحافظات</span>
            <span className="flex items-center gap-1.5"><HandCoins size={13} /> الدفع عند الاستلام</span>
            <span className="flex items-center gap-1.5"><Flame size={13} /> تحميص حديث</span>
          </div>
          <a href="https://instagram.com/khazf.roaster" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[12.5px] font-semibold opacity-75 transition-opacity hover:opacity-100 md:hidden">
            <Instagram size={15} /> khazf.roaster
          </a>
        </div>

        <p className="font-num mt-6 text-center text-[10px] tracking-[0.3em] opacity-35">
          KHAZF © 2026 · SLOW BY DESIGN
        </p>
      </div>
    </footer>
  );
}
