"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import CoffeeFinder from "@/components/CoffeeFinder";
import { useMotion } from "@/lib/motion";
import { Hero, TrustBar, Crops, BuildBox, Gear, Why, Reviews, Assistant } from "@/components/scenes/home9";
import { FeaturedPick } from "@/components/scenes/FeaturedPick";

export default function Home() {
  const scope = useMotion();
  return (
    <div ref={scope} className="pt-20">
      <WelcomeSheet />
      <ExitCapture />
      <Hero />
      <FeaturedPick />
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
