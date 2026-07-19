"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Menu, X, Search, Heart, User, ArrowLeft } from "lucide-react";
import gsap from "gsap";
import { useStore, useSiteConfig } from "@/lib/store";
import { ThemeButton, ThemeSegment } from "@/components/ThemeToggle";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";

/* القائمة — مجمّعة حسب الوظيفة، بفواصل، بلا أيقونات */
const menuGroups: { label: string; href: string }[][] = [
  [
    { label: "المتجر", href: "/products/?cat=all" },
    { label: "القهوة", href: "/products/?cat=coffee" },
    { label: "بناء البوكس", href: "/box/" },
    { label: "أدوات الإسبريسو", href: "/products/?cat=espresso" },
    { label: "أدوات التقطير", href: "/products/?cat=drip" },
  ],
  [
    { label: "الوصفات", href: "/recipes/" },
    { label: "المدونة", href: "/journal/" },
  ],
  [
    { label: "من نحن", href: "/about/" },
    { label: "تواصل معنا", href: "/contact/" },
  ],
  [{ label: "حسابي", href: "/account/" }],
];

const desktopNav = [
  { label: "المتجر", href: "/products/" },
  { label: "الوصفات", href: "/recipes/" },
  { label: "المدونة", href: "/journal/" },
  { label: "من نحن", href: "/about/" },
];

const quickLinks = [
  { href: "/box/", label: "بناء البوكس" },
  { href: "/recipes/", label: "الوصفات" },
  { href: "/start/", label: "لا تعرف ماذا تختار؟" },
];

export default function Header() {
  const ref = useRef<HTMLElement>(null);
  const cartRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { cart, bump, favorites } = useStore();
  const { topBarMessages, logoUrl } = useSiteConfig();
  const { coffees, tools } = useCatalog();

  const count = cart.reduce((s, i) => s + i.qty, 0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle("shrunk", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (bump === 0 || !cartRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      cartRef.current,
      { rotation: 0 },
      {
        keyframes: [
          { rotation: -12, duration: 0.08 },
          { rotation: 10, duration: 0.1 },
          { rotation: -6, duration: 0.1 },
          { rotation: 0, duration: 0.12 },
        ],
      }
    );
  }, [bump]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setQ("");
  }, [pathname]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return { coffees: [], tools: [] };
    const hit = (s: string) => s.toLowerCase().includes(t);
    return {
      coffees: coffees.filter((c) => hit(c.name) || hit(c.latin) || hit(c.country) || c.notes.some(hit)).slice(0, 4),
      tools: tools.filter((x) => hit(x.name) || hit(x.latin) || hit(x.type)).slice(0, 4),
    };
  }, [q]);

  const iconBtn =
    "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-bg-alt active:scale-90";

  return (
    <>
      <header ref={ref} className="site-header fixed inset-x-0 top-0 z-50">
        {/* Top Bar — يظهر فقط عند وجود حملة */}
        {topBarMessages.length > 0 && (
          <Link href="/shipping/" className="topbar block overflow-hidden text-[12px] font-bold text-gold"
            style={{ background: "var(--deep)" }}>
            <span className="marquee-track">
              {[...topBarMessages, ...topBarMessages, ...topBarMessages].map((m, i) => (
                <span key={i} className="mx-8">{m}</span>
              ))}
            </span>
          </Link>
        )}

        <div className="header-row mx-auto flex max-w-6xl items-center justify-between px-4 md:px-8">
          {/* يمين: القائمة (موبايل) + اللوجو */}
          <div className="flex items-center gap-1">
            <button className={`${iconBtn} lg:hidden`} onClick={() => setMenuOpen(true)} aria-label="القائمة">
              <Menu size={20} />
            </button>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              خزف
            </Link>
          </div>

          {/* وسط: روابط الديسكتوب */}
          <nav className="hidden items-center gap-1 text-[13.5px] font-semibold lg:flex">
            {desktopNav.map((l) => {
              const active = pathname.startsWith(l.href.replace(/\/$/, "")) && l.href !== "/";
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    active ? "bg-ink text-bg" : "text-muted hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* يسار: الأيقونات */}
          <div className="flex items-center gap-0.5">
            <ThemeButton />
            <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="بحث">
              <Search size={19} />
            </button>
            <Link href="/account/?tab=fav" className={`${iconBtn} hidden lg:flex`} aria-label="المفضلة">
              <Heart size={19} />
              {favorites.length > 0 && (
                <span className="font-num absolute -top-0.5 -start-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-olive">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link href="/account/" className={`${iconBtn} hidden lg:flex`} aria-label="حسابي">
              <User size={19} />
            </Link>
            <Link ref={cartRef} href="/cart/" className={iconBtn} aria-label="السلة">
              <ShoppingBag size={19} />
              {count > 0 && (
                <span className="font-num absolute -top-0.5 -start-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-olive-text">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ════ القائمة الجانبية — مجمّعة بفواصل ════ */}
      <div className={`fixed inset-0 z-[60] transition-opacity ${menuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        <nav
          className={`absolute inset-y-0 start-0 flex w-[300px] max-w-[86vw] flex-col bg-bg shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line p-5">
            <span className="text-xl font-bold" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              خزف
            </span>
            <button onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-alt" aria-label="إغلاق">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {menuGroups.map((group, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="mx-4 my-2 border-t border-line" />}
                <ul className="space-y-0.5 text-[14.5px]">
                  {group.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-[12px] px-4 py-3 font-semibold transition-colors hover:bg-bg-alt"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-line p-5">
            <ThemeSegment />
            <Link
              href="/start/"
              onClick={() => setMenuOpen(false)}
              className="btn btn-clay block w-full text-center !py-3.5 text-sm"
            >
              لا تعرف ماذا تختار؟
            </Link>
          </div>
        </nav>
      </div>

      {/* ════ Search Overlay ════ */}
      <div className={`fixed inset-0 z-[60] transition-opacity ${searchOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-bg/92 backdrop-blur-xl" onClick={() => setSearchOpen(false)} />
        <div className="relative mx-auto mt-20 w-full max-w-2xl px-5">
          <div className="flex items-center gap-3 border-b-2 border-line pb-4 focus-within:border-accent">
            <Search size={22} className="text-muted" />
            <input
              autoFocus={searchOpen}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="دوّر عن قهوة، أداة، طريقة…"
              className="w-full bg-transparent text-xl font-bold outline-none placeholder:font-medium placeholder:text-muted"
            />
            <button onClick={() => setSearchOpen(false)} className="text-muted hover:text-ink" aria-label="إغلاق">
              <X size={22} />
            </button>
          </div>

          {q.trim().length === 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {quickLinks.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-full border border-line bg-card px-4 py-2 text-[13px] font-semibold text-muted transition-colors hover:border-accent hover:text-accent">
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {q.trim().length > 0 && (
            <div className="mt-5 max-h-[60vh] space-y-5 overflow-y-auto rounded-[18px] border border-line bg-card p-4">
              {results.coffees.length > 0 && (
                <div>
                  <p className="font-num mb-2 px-2 text-[10px] tracking-[0.3em] text-muted">COFFEE</p>
                  {results.coffees.map((c) => (
                    <button key={c.slug} onClick={() => router.push(`/product/?c=${c.slug}`)} className="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-start transition-colors hover:bg-bg-alt">
                      <span>
                        <span className="font-bold">{c.name}</span>
                        <span className="ms-2 text-[12px] text-muted">{c.country} · {c.notes.join(" · ")}</span>
                      </span>
                      <span className="font-num text-[12px] font-semibold">{formatIQD(c.prices.g250)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.tools.length > 0 && (
                <div>
                  <p className="font-num mb-2 px-2 text-[10px] tracking-[0.3em] text-muted">TOOLS</p>
                  {results.tools.map((t) => (
                    <button key={t.slug} onClick={() => router.push(`/product/?t=${t.slug}`)} className="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-start transition-colors hover:bg-bg-alt">
                      <span>
                        <span className="font-bold">{t.name}</span>
                        <span className="ms-2 text-[12px] text-muted">{t.type}</span>
                      </span>
                      <span className="font-num text-[12px] font-semibold">{formatIQD(t.price)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.coffees.length === 0 && results.tools.length === 0 && (
                <p className="py-6 text-center text-sm text-muted">ما لكينا نتائج لـ «{q}»</p>
              )}
              <Link href="/products/?cat=all" className="flex items-center justify-center gap-1.5 rounded-[12px] bg-bg-alt py-3 text-[13px] font-bold text-accent">
                تصفّح المتجر كامل <ArrowLeft size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
