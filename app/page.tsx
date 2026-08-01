"use client";

import PromoBanners from "@/components/scenes/PromoBanners";
import WelcomeSheet from "@/components/WelcomeSheet";
import CoffeeFinder from "@/components/CoffeeFinder";
import { useMotion } from "@/lib/motion";
import { useCatalog } from "@/lib/catalog-context";
import {
  Hero,
  StatementBanner,
  CropsRail,
  BoxTeaser,
  ToolsSection,
  NewArrivals,
  BestSellers,
  JournalTeaser,
  StartHere,
} from "@/components/scenes/home4";

export default function Home() {
  const scope = useMotion();
  const { activePlaces } = useCatalog();

  return (
    <div ref={scope}>
      <WelcomeSheet />
      <Hero />
      <PromoBanners />
      <CropsRail />
      <CoffeeFinder />
      <BestSellers />
      <BoxTeaser />
      <NewArrivals />
      <StatementBanner />
      {activePlaces.includes("espresso_tools") && (
        <ToolsSection
          cat="إسبريسو"
          title="أدوات الإسبريسو"
          sub="من التامبر إلى البيتشر — عدّة الشوت المثالي"
          href="/products/?cat=espresso"
        />
      )}
      {activePlaces.includes("cups") && (
        <ToolsSection
          cat="أكواب"
          title="الأكواب والتقديم"
          sub="أكواب سيراميك وزجاج — لأن التقديم جزء من التجربة"
          href="/products/?cat=cups"
        />
      )}
      {activePlaces.includes("drip_tools") && (
        <ToolsSection
          cat="تقطير"
          title="أدوات التقطير"
          sub="كل ما تحتاجه لكوب V60 نظيف"
          href="/products/?cat=drip"
        />
      )}
      <JournalTeaser />
      <StartHere />
    </div>
  );
}
