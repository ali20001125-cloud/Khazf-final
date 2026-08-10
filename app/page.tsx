"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import CoffeeFinder from "@/components/CoffeeFinder";
import { useMotion } from "@/lib/motion";
import { Hero, TrustBar, Crops, BuildBox, Gear, Reviews, Why, Assistant } from "@/components/scenes/home8";

export default function Home() {
  const scope = useMotion();
  return (
    <div ref={scope} className="pb-16 pt-20">
      <WelcomeSheet />
      <ExitCapture />
      <Hero />
      <TrustBar />
      <Crops />
      <BuildBox />
      <Gear />
      <Reviews />
      <Why />
      <Assistant><CoffeeFinder /></Assistant>
    </div>
  );
}
