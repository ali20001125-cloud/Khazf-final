"use client";

import WelcomeSheet from "@/components/WelcomeSheet";
import ExitCapture from "@/components/ExitCapture";
import CoffeeFinder from "@/components/CoffeeFinder";
import PromoBanners from "@/components/scenes/PromoBanners";
import { useMotion } from "@/lib/motion";
import { useCatalog } from "@/lib/catalog-context";
import {
  HeroPick, PathCards, CropsGrid, BoxBlock, GearRail, TrustRow, StickyCartBar,
} from "@/components/scenes/home5";

export default function Home() {
  const scope = useMotion();
  const { activePlaces } = useCatalog();

  return (
    <div ref={scope} className="pb-24 pt-20">
      <WelcomeSheet />
      <ExitCapture />

      {/* شريط الوعد */}
      <div className="bg-olive py-2.5 text-center text-[11.5px] font-semibold text-olive-text">
        توصيل مجاني على طلبك الأول · الدفع عند الاستلام
      </div>

      <HeroPick />
      <PathCards />
      <CropsGrid />

      <div id="finder">
        <CoffeeFinder />
      </div>

      <BoxBlock />

      {activePlaces.includes("cups") && (
        <GearRail cat="أكواب" title="الأكواب والتقديم" href="/products/?cat=cups" />
      )}
      {activePlaces.includes("drip_tools") && (
        <GearRail cat="تقطير" title="أدوات التقطير" href="/products/?cat=drip" />
      )}
      {activePlaces.includes("espresso_tools") && (
        <GearRail cat="إسبريسو" title="أدوات الإسبريسو" href="/products/?cat=espresso" />
      )}

      <PromoBanners />
      <TrustRow />
      <StickyCartBar />
    </div>
  );
}
