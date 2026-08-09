"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import CoffeeFinder from "@/components/CoffeeFinder";
import { useMotion } from "@/lib/motion";
import {
  Hero, Crops, BoxSection, PickPath, Reviews, Gear, Offers, Why, FinderCta,
} from "@/components/scenes/home7";

export default function Home() {
  const scope = useMotion();

  return (
    <div ref={scope} className="pb-16 pt-20">
      <WelcomeSheet />
      <ExitCapture />

      <Hero />
      <Crops />
      <BoxSection />
      <PickPath />
      <Reviews />
      <Gear />
      <Offers />
      <Why />

      <FinderCta>
        <CoffeeFinder />
      </FinderCta>

      <div className="mt-12 border-y border-line bg-bg-alt">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-line rtl:divide-x-reverse">
          {[["١–٢ يوم", "توصيل لكل العراق"], ["٣٪ نقاط", "تعود إليك"], ["دفع عند الاستلام", "بلا مخاطرة"]].map(([t, d]) => (
            <div key={t} className="px-3 py-5 text-center">
              <p className="text-[12.5px] font-bold">{t}</p>
              <p className="mt-1 text-[10.5px] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
