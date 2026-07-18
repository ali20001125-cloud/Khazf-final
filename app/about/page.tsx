"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotion, reduced } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const steps = [
  { t: "المزرعة", n: "٢٢٠٠م فوق سطح البحر", x: "12%", y: "6%" },
  { t: "القطف", n: "يدوياً · الكرز الناضج فقط", x: "58%", y: "22%" },
  { t: "المعالجة", n: "تجفيف طبيعي · أسرّة مرفوعة", x: "14%", y: "40%" },
  { t: "التحميص", n: "١٢ دقيقة · ٢٠٥°", x: "60%", y: "57%" },
  { t: "التعبئة", n: "صمام أحادي · نيتروجين", x: "13%", y: "73%" },
  { t: "إلى بابك", n: "كل محافظات العراق", x: "56%", y: "89%" },
];

export default function AboutPage() {
  const scope = useMotion();
  const sceneRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      const root = sceneRef.current!;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=2800",
          pin: true,
          scrub: 1,
        },
      });

      tl.fromTo(
        ".ab-path",
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 6, ease: "none" }
      );

      gsap.utils.toArray<HTMLElement>(".ab-step", root).forEach((el, i) => {
        tl.fromTo(
          el,
          { autoAlpha: 0, scale: 0.85 },
          { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)" },
          0.25 + i * 0.95
        );
      });
    },
    { scope: sceneRef }
  );

  return (
    <div ref={scope}>
      {/* مقدمة */}
      <section className="px-6 pb-8 pt-32 text-center">
        <p className="reveal font-num text-[10px] tracking-[0.4em] text-muted">
          OUR STORY
        </p>
        <h1 className="reveal mt-4 text-4xl font-bold md:text-6xl">قصتنا</h1>
        <p className="reveal mx-auto mt-4 max-w-md text-[15px] leading-loose text-muted">
          من مزرعة على ارتفاع ٢٢٠٠ متر… إلى باب بيتك.
          <br />
          مرّر، وخلّي الرحلة تتكشّف.
        </p>
      </section>

      {/* الرحلة المثبّتة */}
      <section ref={sceneRef} className="relative overflow-hidden bg-bg">
        <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col px-6 pt-20">
          <div className="relative w-full flex-1" style={{ minHeight: "72vh" }}>
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 16 4 C 60 8 88 16 62 24 C 36 32 4 34 18 42 C 32 50 84 50 62 59 C 40 68 6 68 18 76 C 30 84 76 82 60 91"
                stroke="var(--line)"
                strokeWidth="0.55"
              />
              <path
                className="ab-path"
                d="M 16 4 C 60 8 88 16 62 24 C 36 32 4 34 18 42 C 32 50 84 50 62 59 C 40 68 6 68 18 76 C 30 84 76 82 60 91"
                stroke="var(--accent)"
                strokeWidth="0.85"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
                strokeLinecap="round"
              />
            </svg>

            {steps.map((s, i) => (
              <div
                key={s.t}
                className="ab-step absolute flex flex-col gap-1"
                style={{ insetInlineStart: s.x, top: s.y }}
              >
                <span className="font-num text-[10px] tracking-[0.25em] text-accent" dir="ltr">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-xl font-bold md:text-2xl">{s.t}</span>
                <span className="font-num text-[11px] text-muted">{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* خاتمة */}
      <section className="px-6 py-24 text-center">
        <h2 className="reveal text-2xl font-bold md:text-4xl">
          قهوةٌ صُنعت بصبر،
          <br />
          <span className="text-accent">لمن يعرف قيمة التوقّف</span>
        </h2>
        <div className="reveal mt-8">
          <Link href="/product/" className="btn btn-olive magnetic" data-strength="22">
            تسوّق المحاصيل
          </Link>
        </div>
      </section>
    </div>
  );
}
