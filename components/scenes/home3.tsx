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
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      gsap.fromTo(
        ".hr-in",
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.65, ease: "power3.out", stagger: 0.08 }
      );
      /* إشارة النزول — نبضة هادئة */
      gsap.to(".hr-cue", {
        y: 6,
        opacity: 0.9,
        duration: 1.4,
        ease: "power1.inOut",
        repeat: -1,
        yoyo: true,
      });
    },
    { scope }
  );

  return (
    <section
      ref={scope}
      className="flex min-h-[46svh] flex-col items-center justify-center px-6 pb-8 pt-28 text-center md:min-h-[52svh]"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="خزف" className="hr-in h-16 w-auto opacity-0 md:h-20" />
      ) : (
        <h1
          className="hr-in text-4xl font-bold opacity-0 md:text-5xl"
          style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
        >
          خزف
        </h1>
      )}
      <p className="hr-in mt-6 text-[15px] font-semibold text-muted opacity-0 md:text-[17px]">
        قهوة مختصة
        <span className="mx-2.5 text-line">·</span>
        أدوات تحضير
        <span className="mx-2.5 text-line">·</span>
        ابنِ صندوقك
      </p>

      <div className="hr-in mt-9 flex flex-wrap justify-center gap-3 opacity-0">
        <Link href="/products/?cat=all" className="btn btn-olive magnetic" data-strength="20">
          تسوّق الآن
        </Link>
        <Link href="/box/" className="btn btn-ghost">
          بناء البوكس
        </Link>
      </div>

      <div className="hr-in mt-12 flex flex-col items-center gap-4 opacity-0">
        <span className="block h-px w-16 bg-line" />
        <ChevronDown className="hr-cue text-muted opacity-50" size={20} strokeWidth={1.8} />
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
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[16px] bg-bg-alt">
                  <BagArt
                    className="h-[70%] text-olive transition-transform duration-500 group-hover:scale-[1.07]"
                    accent={c.accent}
                    latin={c.latin}
                  />
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
  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="reveal mx-auto max-w-6xl overflow-hidden rounded-[26px] bg-olive px-8 py-16 text-center text-olive-text md:py-20">
        <p className="font-num text-[10px] tracking-[0.4em] opacity-60">BUILD YOUR BOX</p>
        <h2 className="mx-auto mt-4 max-w-lg text-3xl font-bold md:text-4xl md:leading-snug">
          كل كيس تضيفه… مكافأة أكبر
        </h2>
        <div className="reveal-group mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: "٣", t: "خصم ١٠٪" },
            { n: "٤", t: "خصم ٢٠٪" },
            { n: "٥", t: "توصيل مجاني" },
            { n: "٦", t: "اختر هديتك", gold: true },
          ].map((x) => (
            <div
              key={x.n}
              className={`rounded-[16px] border px-3 py-5 transition-transform duration-300 hover:-translate-y-1 ${
                x.gold ? "border-gold/60 bg-gold/10" : "border-olive-text/15 bg-olive-text/5"
              }`}
            >
              <span
                className={`block text-3xl font-bold ${x.gold ? "text-gold" : ""}`}
                style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
              >
                {x.n}
              </span>
              <span className={`mt-1.5 block text-[11px] font-semibold ${x.gold ? "text-gold" : "opacity-85"}`}>
                {x.t}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-9">
          <Link href="/box/" className="btn btn-clay magnetic" data-strength="22">
            ابدأ بناء بوكسك
          </Link>
        </div>
      </div>
    </section>
  );
}
