"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useCatalog } from "@/lib/catalog-context";
import { useSiteConfig, useStore } from "@/lib/store";
import { reduced } from "@/lib/motion";
import BagArt from "@/components/BagArt";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ═══════════ ١) الهيرو — خزف بسطر واحد، والمنتجات تبدأ فوراً ═══════════ */
export function Hero() {
  const { logoUrl } = useSiteConfig();
  const { coffees } = useCatalog();
  const scope = useRef<HTMLElement>(null);
  const star = coffees.find((c) => c.image) ?? coffees[0];

  useGSAP(() => {
    if (reduced()) { gsap.set(".hr-in", { opacity: 1 }); return; }
    gsap.fromTo(".hr-in", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: "power3.out", delay: 0.15 });
  }, { scope });

  return (
    <section ref={scope} className="relative overflow-hidden px-5 pb-12 pt-24 md:px-8 md:pt-28">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-6">
        {/* النص */}
        <div className="text-center md:text-start">
          <p className="hr-in text-[12px] font-bold tracking-wide text-accent opacity-0">
            قهوة مختصة · تُحمَّص باستمرار
          </p>
          <h1 className="hr-in mt-3 text-3xl font-bold leading-[1.25] opacity-0 md:text-5xl md:leading-[1.2]">
            قهوتك المفضلة الجاية
            <br />
            <span className="text-accent">توصلك لباب بيتك</span>
          </h1>
          <p className="hr-in mt-4 text-[14px] leading-relaxed text-muted opacity-0 md:text-[15px]">
            محاصيل مختارة من إثيوبيا والبرازيل وكولومبيا — لكل محافظات العراق خلال يوم إلى يومين.
          </p>
          <div className="hr-in mt-7 flex flex-wrap justify-center gap-3 opacity-0 md:justify-start">
            <Link href="/products/?cat=coffee" className="btn btn-olive magnetic" data-strength="20">تسوّق القهوة</Link>
            <Link href="/box/" className="btn btn-ghost">ابنِ بوكسك ووفّر</Link>
          </div>
        </div>

        {/* المنتج البطل */}
        {star && (
          <Link href={`/product/?c=${star.slug}`} className="hr-in relative mx-auto block w-full max-w-[340px] opacity-0">
            <div className="absolute inset-0 -z-10 rounded-full blur-3xl opacity-25" style={{ background: star.accent }} />
            <div className="rounded-[28px] border border-line bg-card p-7 transition-transform duration-300 hover:-translate-y-1.5">
              {star.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={star.image} alt={star.name} className="mx-auto aspect-square w-full max-w-[240px] rounded-[18px] object-cover" />
              ) : (
                <BagArt className="mx-auto h-56 w-auto text-olive md:h-64" accent={star.accent} latin={star.latin} />
              )}
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-muted">{star.country}</p>
                  <p className="text-xl font-bold">{star.name}</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold" style={{ color: star.accent }}>{star.notes.slice(0, 2).join(" · ")}</p>
                </div>
                <span className="font-num rounded-full bg-olive px-4 py-2 text-[13px] font-bold text-olive-text">
                  {formatIQD(star.prices.g250)}
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

/* ═══════════ ٢) بانر الرسالة — نحيف، بلا تثبيت، يتوقف خارج الشاشة ═══════════ */
const phrases = ["مختارة بعناية", "نحمّص باستمرار", "١٠٠٪ أرابيكا", "توصيل لكل العراق"];

export function StatementBanner() {
  const { coffees } = useCatalog();
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      const ws = gsap.utils.toArray<HTMLElement>(".sb-word", scope.current!);
      gsap.set(ws, { autoAlpha: 0, y: 16 });

      const tl = gsap.timeline({ repeat: -1, paused: true });
      ws.forEach((w) => {
        tl.to(w, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" })
          .to(w, { autoAlpha: 0, y: -16, duration: 0.4, ease: "power2.in" }, "+=1.7");
      });

      /* يشتغل فقط وهو ظاهر — ما يشتّت ولا يستهلك */
      ScrollTrigger.create({
        trigger: scope.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
      });
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="text-olive-text"
      style={{ background: "var(--deep)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-4 px-6 py-10 md:justify-between md:py-12">
        <div className="flex items-center gap-4">
          {coffees.slice(0, 3).map((c) => (
            <BagArt key={c.slug} className="h-12 text-olive-text md:h-14" accent={c.accent} />
          ))}
        </div>

        <div className="flex items-baseline gap-3 text-2xl font-bold md:text-3xl">
          <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>خزف —</span>
          <span className="relative inline-block h-9 w-52 md:h-10 md:w-64">
            {phrases.map((p) => (
              <span key={p} className="sb-word absolute inset-x-0 text-accent-soft">
                {p}
              </span>
            ))}
          </span>
        </div>

        <Link
          href="/about/"
          className="text-[13px] font-bold text-gold transition-opacity hover:opacity-80"
        >
          اقرأ قصتنا ←
        </Link>
      </div>
    </section>
  );
}

/* ═══════════ ٣) المحاصيل — Horizontal Scroll (الـ Pin الوحيد بالصفحة) ═══════════ */
export function CropsRail() {
  const { coffees } = useCatalog();
  const { addToCart } = useStore();
  const scope = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const track = trackRef.current!;
        const dist = () =>
          track.scrollWidth - document.documentElement.clientWidth;
        gsap.to(track, {
          x: () => dist(),
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: () => "+=" + dist(),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope }
  );

  return (
    <section ref={scope} className="overflow-hidden bg-bg py-20 md:py-0">
      <div className="flex min-h-0 flex-col justify-center md:min-h-[100svh]">
        <div className="reveal mx-auto mb-10 flex w-full max-w-6xl items-end justify-between px-5 md:px-8">
          <div>
            <p className="font-num text-[10px] tracking-[0.4em] text-muted">THE CROPS</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">محاصيلنا</h2>
          </div>
          <Link href="/products/" className="hidden items-center gap-1.5 text-sm font-semibold text-accent sm:flex">
            المتجر كامل <ArrowLeft size={15} />
          </Link>
        </div>

        <div className="no-scrollbar overflow-x-auto md:overflow-visible">
          <div ref={trackRef} className="flex w-max gap-5 px-5 will-change-transform md:px-8">
            {coffees.map((c, i) => (
              <Link
                key={c.slug}
                href={`/product/?c=${c.slug}`}
                className="group w-[74vw] max-w-[330px] shrink-0 rounded-[22px] border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/5"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[16px] bg-white">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" />
                  ) : (
                    <BagArt
                      className="h-[70%] text-olive transition-transform duration-500 group-hover:scale-[1.07]"
                      accent={c.accent}
                      latin={c.latin}
                    />
                  )}
                </div>
                <div className="mt-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-muted">
                      {c.country} · <span className="font-num" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                    </p>
                    <h3 className="mt-1 text-xl font-bold">{c.name}</h3>
                    <p className="mt-1.5 text-[12px] font-semibold" style={{ color: c.accent }}>
                      {c.notes.join(" · ")}
                    </p>
                  </div>
                  <span className="font-num mt-1 shrink-0 text-sm font-semibold">
                    {formatIQD(c.prices.g250)}
                  </span>
                </div>
                <span
                  role="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (c.soldOut) return;
                    addToCart({ slug: c.slug, variant: "G250", grind: "حبوب كاملة", name: c.name, meta: "٢٥٠غ · حبوب كاملة", priceShown: c.prices.g250 });
                  }}
                  className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold ${
                    c.soldOut ? "cursor-default bg-bg-alt text-muted" : "bg-olive text-olive-text active:scale-95"
                  }`}
                >
                  {c.soldOut ? "نفذ مؤقتاً" : "أضف للسلة"}
                </span>
              </Link>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ ٤) دعوة البوكس — النسخة المعتمدة، محسّنة ═══════════ */
export function BoxTeaser() {
  const rungs = [
    { n: "٣", t: "خصم ١٠٪" },
    { n: "٤", t: "خصم ٢٠٪" },
    { n: "٥", t: "توصيل مجاني" },
    { n: "٦", t: "اختر هديتك المجانية", gold: true },
  ];
  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="reveal mx-auto max-w-2xl overflow-hidden rounded-[26px] border border-line">
        {/* الرأس المميّز */}
        <div className="bg-olive px-8 py-11 text-center text-olive-text">
          <p className="amiri text-[32px] font-bold leading-tight text-gold" style={{ fontFamily: "'Amiri', serif" }}>
            صندوق خزف
          </p>
          <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed opacity-85">
            صندوقك الخاص من محاصيلك المفضّلة — كل كيس تضيفه يكبّر مكافأتك
          </p>
        </div>
        {/* سُلّم المكافآت */}
        <div className="reveal-group bg-card p-2 md:p-3">
          {rungs.map((r) => (
            <div key={r.n}
              className={`flex items-center gap-4 rounded-[14px] px-5 py-4 transition-colors ${
                r.gold ? "bg-gold" : "hover:bg-bg"
              }`}>
              <span className={`font-num text-[22px] font-bold ${r.gold ? "text-ink" : "text-accent"}`}>{r.n}</span>
              <span className={`text-[14px] font-semibold ${r.gold ? "text-ink" : ""}`}>{r.t}</span>
              {r.gold && <span className="ms-auto text-[11px] font-bold text-ink/70">أعلى مكافأة</span>}
            </div>
          ))}
        </div>
        {/* الزر */}
        <div className="bg-card px-6 pb-7 pt-1 text-center">
          <Link href="/box/" className="btn btn-clay magnetic" data-strength="22">
            اصنع صندوقك
          </Link>
        </div>
      </div>
    </section>
  );
}
