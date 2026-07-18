"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { articles, grindGuide, toolsGuide } from "@/lib/data";
import { useMotion } from "@/lib/motion";

function JournalInner() {
  const params = useSearchParams();
  const scope = useMotion();
  const slug = params.get("a");
  const article = articles.find((a) => a.slug === slug);
  const [tag, setTag] = useState("الكل");
  const tags = ["الكل", ...new Set(articles.map((a) => a.tag))];
  const list = tag === "الكل" ? articles : articles.filter((a) => a.tag === tag);

  /* ─── عرض مقال ─── */
  if (article)
    return (
      <article key={article.slug} ref={scope} className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
        <Link href="/journal/" className="reveal flex w-fit items-center gap-1.5 text-[13px] font-bold text-muted hover:text-accent">
          <ArrowLeft size={14} className="rotate-180" /> كل المقالات
        </Link>
        <span className="reveal mt-6 inline-block rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-muted">
          {article.tag}
        </span>
        <h1 className="reveal mt-4 text-3xl font-bold leading-snug md:text-5xl md:leading-snug">
          {article.title}
        </h1>
        <p className="reveal font-num mt-4 flex items-center gap-1.5 text-[12px] text-muted">
          <Clock size={13} /> {article.minutes} دقائق قراءة
        </p>
        <div className="reveal-group mt-10 space-y-6">
          {article.paras.map((p, i) => (
            <p key={i} className="text-[16px] leading-[2.2] text-ink/90">
              {p}
            </p>
          ))}
        </div>

        {article.kind === "grind" && (
          <div className="reveal mt-8 space-y-3 rounded-[22px] border border-line bg-card p-6">
            {grindGuide.map((g) => (
              <div key={g.method} className="flex items-center gap-4">
                <span className="w-24 shrink-0 text-[13px] font-bold">{g.method}</span>
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <i key={i} className={`h-2.5 flex-1 rounded-full ${i < g.level ? "bg-accent" : "bg-bg-alt"}`} />
                  ))}
                </div>
                <span className="w-20 shrink-0 text-end text-[11px] text-muted">{g.hint}</span>
              </div>
            ))}
          </div>
        )}

        {article.kind === "tools" && (
          <div className="reveal-group mt-8 space-y-3">
            {toolsGuide.map((t) => (
              <div key={t.name} className="rounded-[18px] border border-line bg-card p-5">
                <h3 className="font-bold">{t.name}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t.diff}</p>
              </div>
            ))}
          </div>
        )}

        {(article.kind === "grind" || article.kind === "tools") && (
          <Link href="/recipes/" className="reveal mt-6 flex items-center justify-center gap-1.5 rounded-[16px] bg-olive py-4 text-[13px] font-bold text-olive-text">
            جاهز تطبّق؟ افتح الوصفات بالمؤقت الحي <ArrowLeft size={14} />
          </Link>
        )}
        <div className="reveal mt-12 rounded-[20px] bg-olive p-7 text-center text-olive-text">
          <h3 className="text-xl font-bold">جاهز تجرّب بنفسك؟</h3>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/products/?cat=coffee" className="btn btn-clay !px-7 !py-3 text-sm">تسوّق القهوة</Link>
            <Link href="/recipes/" className="btn !px-7 !py-3 text-sm" style={{ border: "1px solid rgba(250,247,240,.3)", color: "var(--olive-text)" }}>
              Brew Hub
            </Link>
          </div>
        </div>
      </article>
    );

  /* ─── القائمة ─── */
  return (
    <div ref={scope} className="mx-auto max-w-5xl px-4 pb-24 pt-32 md:px-8">
      <p className="reveal font-num text-[10px] tracking-[0.4em] text-muted">COFFEE JOURNAL</p>
      <h1 className="reveal mt-3 text-4xl font-bold md:text-5xl">المدونة</h1>
      <p className="reveal mt-3 max-w-md text-[14px] leading-loose text-muted">
        مقالات وأدلة تخلّيك تفهم قهوتك أعمق — من الحبة للفنجان.
      </p>

      <div className="no-scrollbar mt-7 flex gap-2 overflow-x-auto pb-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
              tag === t ? "border-accent bg-accent text-olive-text" : "border-line bg-card text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="reveal-group mt-7 grid gap-5 md:grid-cols-3">
        {list.map((a) => (
          <Link
            key={a.slug}
            href={`/journal/?a=${a.slug}`}
            className="group flex flex-col rounded-[20px] border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5"
          >
            <span className="w-fit rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-muted">{a.tag}</span>
            <h2 className="mt-4 text-xl font-bold leading-snug">{a.title}</h2>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{a.excerpt}</p>
            <span className="mt-5 flex items-center gap-1.5 text-[13px] font-bold text-accent">
              اقرأ المقال <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/recipes/"
        className="reveal mt-10 flex items-center justify-center gap-2 rounded-[18px] bg-olive py-4 text-[14px] font-bold text-olive-text"
      >
        جاهز تحضّر؟ افتح الوصفات — حاسبة بمؤقت حي <ArrowLeft size={15} />
      </Link>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <JournalInner />
    </Suspense>
  );
}
