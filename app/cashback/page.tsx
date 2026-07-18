"use client";

import Link from "next/link";
import { Wallet, ShoppingBag, Percent } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useEffect, useState } from "react";
import { useMotion } from "@/lib/motion";

export default function CashbackPage() {
  const scope = useMotion();
  const [me, setMe] = useState<{ pointsBalance?: number; pointsValueDinars?: number; guest?: boolean }>({});
  useEffect(() => { fetch("/api/customer/me").then((r) => r.json()).then(setMe).catch(() => {}); }, []);
  return (
    <div ref={scope} className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="reveal text-3xl font-bold md:text-4xl">الكاش باك</h1>

      <div className="reveal mt-6 rounded-[24px] bg-olive p-8 text-center text-olive-text">
        <p className="text-[12px] opacity-70">رصيدك الحالي</p>
        <p className="font-num mt-2 text-5xl font-bold text-gold">{formatIQD(me.pointsValueDinars ?? 0)}</p>
        <Link href="/products/?cat=all" className="btn btn-clay mt-6 inline-block !px-8 !py-3 text-sm">استخدمه بطلبك الجاي</Link>
      </div>

      <h2 className="reveal mt-12 text-xl font-bold">شلون يشتغل؟</h2>
      <div className="reveal-group mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { Icon: ShoppingBag, t: "اطلب", d: "أي طلب من المتجر أو البوكس" },
          { Icon: Percent, t: "اجمع ٣٪", d: "من قيمة كل طلب — تلقائياً" },
          { Icon: Wallet, t: "استخدم", d: "خصماً مباشراً من صفحة السلة" },
        ].map((x, i) => (
          <div key={x.t} className="rounded-[18px] border border-line bg-card p-5 text-center">
            <span className="font-num text-[11px] text-muted" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
            <x.Icon size={22} className="mx-auto mt-2 text-accent" />
            <h3 className="mt-3 font-bold">{x.t}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{x.d}</p>
          </div>
        ))}
      </div>

      <p className="reveal mt-10 rounded-[16px] bg-bg-alt px-5 py-4 text-center text-[12.5px] font-semibold text-muted">
        نقاطك تُفعَّل بعد ٤٨ ساعة من توصيل كل طلب · وتبقى فعّالة ٣ شهور من آخر طلب
      </p>
    </div>
  );
}
