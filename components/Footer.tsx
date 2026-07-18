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
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <p className="text-3xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              خزف
            </p>
            <a
              href="https://instagram.com/khazf.roaster"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-[13px] opacity-70 transition-opacity hover:opacity-100"
            >
              <Instagram size={15} /> khazf.roaster
            </a>
            <div className="mt-6 space-y-2 text-[12px] opacity-55">
              <p className="flex items-center gap-2"><Truck size={13} /> توصيل لكل المحافظات</p>
              <p className="flex items-center gap-2"><HandCoins size={13} /> الدفع عند الاستلام</p>
              <p className="flex items-center gap-2"><Flame size={13} /> نحمّص باستمرار</p>
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="mb-4 text-[13px] font-bold text-gold">{c.title}</h4>
              <ul className="space-y-2.5 text-[13px] opacity-75">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-opacity hover:opacity-100 hover:text-gold">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="font-num mt-12 border-t border-olive-text/10 pt-6 text-center text-[10px] tracking-[0.3em] opacity-35">
          KHAZF © 2026 · SLOW BY DESIGN
        </p>
      </div>
    </footer>
  );
}
