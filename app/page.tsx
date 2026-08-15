"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import CoffeeFinder from "@/components/CoffeeFinder";
import { useMotion } from "@/lib/motion";
import { Crops, BuildBox, Gear, Why, Reviews, Assistant } from "@/components/scenes/home9";
import { HeroPrime } from "@/components/scenes/HeroPrime";

export default function Home() {
  const scope = useMotion();
  return (
    <div ref={scope} className="pt-20">
      <WelcomeSheet />
      <ExitCapture />
      <HeroPrime />
      <Crops />
      <BuildBox />
      <Gear />
      <Reviews />
      <Why />
      <Assistant><CoffeeFinder /></Assistant>
    </div>
  );
}
