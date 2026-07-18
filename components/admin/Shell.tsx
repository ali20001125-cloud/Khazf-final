"use client";

/** هيكل اللوحة: قائمة جانبية (☰ بالموبايل) + تنبيه صوتي للطلبات الجديدة */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ExternalLink, LogOut } from "lucide-react";

const nav = [
  { href: "/admin/", label: "لوحة القيادة" },
  { href: "/admin/orders/", label: "الطلبات", badge: "pending" as const },
  { href: "/admin/products/", label: "المنتجات" },
  { href: "/admin/inventory/", label: "المخزون والوجبات", badge: "lowStock" as const },
  { href: "/admin/customers/", label: "العملاء" },
  { href: "/admin/coupons/", label: "أكواد الخصم" },
  { href: "/admin/loyalty/", label: "الولاء والرحلة" },
  { href: "/admin/reviews/", label: "التقييمات", badge: "pendingReviews" as const },
  { href: "/admin/banners/", label: "البنرات" },
  { href: "/admin/settings/", label: "الإعدادات" },
];

type Stats = { pending: number; pendingReviews: number; lowStock: number };

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({ pending: 0, pendingReviews: 0, lowStock: 0 });
  const prevPending = useRef<number | null>(null);

  /* التنبيه الصوتي: زيادة بالطلبات المعلّقة = رنّة + تحديث */
  useEffect(() => {
    let alive = true;
    const beep = () => {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 880; g.gain.value = 0.08;
        o.start(); o.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
        o.stop(ctx.currentTime + 0.28);
      } catch {}
    };
    const poll = async () => {
      try {
        const r = await fetch("/api/admin/stats/");
        if (!r.ok) return;
        const d: Stats = await r.json();
        if (!alive) return;
        setStats(d);
        if (prevPending.current !== null && d.pending > prevPending.current) {
          beep();
          router.refresh();
        }
        prevPending.current = d.pending;
      } catch {}
    };
    poll();
    const t = setInterval(poll, 25000);
    return () => { alive = false; clearInterval(t); };
  }, [router]);

  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    await fetch("/api/admin/logout/", { method: "POST" });
    router.push("/admin/login/");
  };

  const List = () => (
    <nav className="space-y-0.5 text-[13.5px]">
      {nav.map((n) => {
        const active = n.href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(n.href.slice(0, -1));
        const b = n.badge ? stats[n.badge] : 0;
        return (
          <Link key={n.href} href={n.href}
            className={`flex items-center justify-between rounded-[10px] px-4 py-2.5 font-semibold transition-colors ${
              active ? "bg-olive text-olive-text" : "text-muted hover:bg-bg-alt hover:text-ink"
            }`}>
            {n.label}
            {b > 0 && (
              <span className={`font-num rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-olive-text/20" : "bg-accent text-olive-text"}`}>{b}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      {/* جانبي ثابت */}
      <aside className="hidden border-e border-line bg-card lg:flex lg:flex-col">
        <div className="border-b border-line p-5">
          <p className="text-lg font-bold">لوحة خزف</p>
          <p className="font-num mt-0.5 text-[10px] tracking-[0.3em] text-muted">ADMIN</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3"><List /></div>
        <div className="space-y-1 border-t border-line p-3 text-[13px] font-semibold">
          <Link href="/" target="_blank" className="flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-muted hover:bg-bg-alt hover:text-ink">
            <ExternalLink size={14} /> عرض المتجر
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-[10px] px-4 py-2.5 text-muted hover:bg-bg-alt hover:text-accent">
            <LogOut size={14} /> خروج
          </button>
        </div>
      </aside>

      {/* موبايل */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="القائمة" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-bg-alt"><Menu size={19} /></button>
        <p className="font-bold">لوحة خزف</p>
        {stats.pending > 0 ? (
          <Link href="/admin/orders/" className="font-num rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-olive-text">{stats.pending}</Link>
        ) : <span className="w-9" />}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[260px] flex-col bg-bg shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-4">
              <p className="font-bold">لوحة خزف</p>
              <button onClick={() => setOpen(false)} aria-label="إغلاق" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-bg-alt"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3"><List /></div>
            <div className="border-t border-line p-3">
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-muted hover:text-accent"><LogOut size={14} /> خروج</button>
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 pb-20 pt-6 lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
