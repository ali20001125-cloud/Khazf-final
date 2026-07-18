"use client";

import Link from "next/link";
import { Gift, Sparkles, Wallet } from "lucide-react";
import { useMotion } from "@/lib/motion";

export default function OffersPage() {
  const scope = useMotion();
  return (
    <div ref={scope} className="mx-auto max-w-4xl px-4 pb-24 pt-32 md:px-8">
      <h1 className="reveal text-3xl font-bold md:text-4xl">العروض والمكافآت</h1>
      <p className="reveal mt-2 text-[14px] text-muted">
        بلا أكواد ترحيبية — مكافآتنا الحقيقية تكبر مع كل طلب.
      </p>

      {/* البوكس */}
      <div className="reveal mt-8 rounded-[22px] bg-olive p-7 text-olive-text">
        <div className="flex items-center gap-3">
          <Gift size={24} className="text-gold" />
          <h2 className="text-xl font-bold">اصنع بوكسك — المكافأة تكبر مع كل كيس</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          {[
            { n: "٣", t: "خصم ١٠٪" },
            { n: "٤", t: "خصم ٢٠٪" },
            { n: "٥", t: "+ توصيل مجاني" },
            { n: "٦", t: "+ اختر هديتك", gold: true },
          ].map((x) => (
            <div key={x.n} className={`rounded-[14px] px-3 py-4 ${x.gold ? "bg-gold/15" : "bg-olive-text/8"}`}>
              <span className={`block text-2xl font-bold ${x.gold ? "text-gold" : ""}`}>{x.n}</span>
              <span className={`mt-1 block text-[11px] font-semibold ${x.gold ? "text-gold" : "opacity-85"}`}>{x.t}</span>
            </div>
          ))}
        </div>
        <Link href="/box/" className="btn btn-clay mt-6 inline-block !px-8 !py-3.5 text-sm">
          ابنِ بوكسك
        </Link>
      </div>

      {/* الولاء */}
      <div className="reveal mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-card p-6">
          <Wallet size={20} className="text-gold" />
          <h3 className="mt-3 text-lg font-bold">كاش باك ٣٪ — فلوسك ترجع</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            كل ١٬٠٠٠ دينار من قيمة منتجاتك = نقطة. رصيدك يتجمّع وتستخدمه خصماً بأي طلب.
          </p>
        </div>
        <div className="rounded-[22px] border border-line bg-card p-6">
          <Sparkles size={20} className="text-accent" />
          <h3 className="mt-3 text-lg font-bold">رحلة المكافآت — ٦ طلبات</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            كل طلب يفتح مفاجأة للطلب الجاي: خصم، توصيل مجاني، هدايا… وبالطلب السادس كيس قهوة مجاني.
          </p>
        </div>
      </div>

      <p className="reveal mt-6 rounded-[16px] bg-bg-alt px-5 py-3.5 text-center text-[12px] font-semibold text-muted">
        اطلب خلال ٣ شهور حتى تبقى مكافآتك فعّالة
      </p>
    </div>
  );
}
