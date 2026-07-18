"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * نواة حركة خزف:
 * .reveal        عنصر مفرد يظهر عند التمرير
 * .reveal-group  أبناء العنصر يظهرون بتدرّج
 * .magnetic      زر ينجذب للماوس (ديسكتوب)
 * .tilt          بطاقة تميل 3D (ديسكتوب)
 */
export function useMotion() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      const root = scope.current;
      if (!root) return;

      gsap.utils.toArray<HTMLElement>(".reveal", root).forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".reveal-group", root).forEach((g) => {
        gsap.fromTo(
          g.children,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            ease: "power3.out",
            stagger: 0.09,
            scrollTrigger: { trigger: g, start: "top 85%" },
          }
        );
      });

      if (!window.matchMedia("(pointer: fine)").matches) return;
      const ac = new AbortController();

      root.querySelectorAll<HTMLElement>(".magnetic").forEach((btn) => {
        const s = Number(btn.dataset.strength ?? 24);
        btn.addEventListener(
          "mousemove",
          (e) => {
            const r = btn.getBoundingClientRect();
            gsap.to(btn, {
              x: ((e.clientX - r.left - r.width / 2) / r.width) * s,
              y: ((e.clientY - r.top - r.height / 2) / r.height) * s,
              duration: 0.4,
              ease: "power3.out",
            });
          },
          { signal: ac.signal }
        );
        btn.addEventListener(
          "mouseleave",
          () =>
            gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1,0.4)" }),
          { signal: ac.signal }
        );
      });

      root.querySelectorAll<HTMLElement>(".tilt").forEach((card) => {
        card.addEventListener(
          "mousemove",
          (e) => {
            const r = card.getBoundingClientRect();
            gsap.to(card, {
              rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6,
              rotateX: -((e.clientY - r.top) / r.height - 0.5) * 6,
              duration: 0.5,
              ease: "power2.out",
              transformPerspective: 900,
            });
          },
          { signal: ac.signal }
        );
        card.addEventListener(
          "mouseleave",
          () =>
            gsap.to(card, {
              rotateX: 0,
              rotateY: 0,
              duration: 0.8,
              ease: "elastic.out(1,0.5)",
            }),
          { signal: ac.signal }
        );
      });

      return () => ac.abort();
    },
    { scope }
  );

  return scope;
}

/** شريط كلمات لانهائي — سرعته تزيد مع سرعة تمريرك */
export function Marquee({
  words,
  dark = true,
}: {
  words: string[];
  dark?: boolean;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      const tween = gsap.to(".mq-track", {
        xPercent: -50,
        duration: 28,
        repeat: -1,
        ease: "none",
      });
      ScrollTrigger.create({
        onUpdate(self) {
          const v = Math.min(Math.abs(self.getVelocity()) / 800, 3);
          gsap.to(tween, {
            timeScale: 1 + v,
            duration: 0.3,
            overwrite: true,
            onComplete: () => gsap.to(tween, { timeScale: 1, duration: 1.4 }),
          });
        },
      });
    },
    { scope }
  );

  return (
    <div
      ref={scope}
      dir="ltr"
      aria-hidden
      className="overflow-hidden py-12"
      style={{ background: dark ? "var(--deep)" : "var(--bg-alt)" }}
    >
      <div className="mq-track inline-block whitespace-nowrap will-change-transform">
        {[0, 1].map((c) =>
          words.map((w) => (
            <span
              key={`${c}-${w}`}
              className="inline-block px-7 text-4xl font-bold md:text-5xl"
              style={{
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                color: dark ? "#FAF7F0" : "var(--ink)",
                opacity: 0.92,
              }}
            >
              {w} <span style={{ color: "var(--accent)", opacity: 1 }}>·</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
