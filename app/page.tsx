"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import { useMotion } from "@/lib/motion";
import { HeroX, StripX, CropsX, BoxX, WhyX, ReviewsX, CtaX } from "@/components/scenes/home-v2";

export default function Home() {
  const scope = useMotion();
  return (
    <div ref={scope} className="pt-20" style={{ background: "#f4f1ec" }}>
      <WelcomeSheet />
      <ExitCapture />
      <HeroX />
      <StripX />
      <CropsX />
      <BoxX />
      <WhyX />
      <ReviewsX />
      <CtaX />
    </div>
  );
}
