"use client";

import PromoBanners from "@/components/scenes/PromoBanners";
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
      <Hero />
      <PromoBanners />
      <CropsRail />
      <BoxTeaser />
      {activePlaces.includes("espresso_tools") && (
        <ToolsSection
          cat="إسبريسو"
          title="أدوات الإسبريسو"
          sub="من التامبر إلى البيتشر — عدّة الشوت المثالي"
          href="/products/?cat=espresso"
        />
      )}
      <StatementBanner />
      {activePlaces.includes("drip_tools") && (
        <ToolsSection
          cat="تقطير"
          title="أدوات التقطير"
          sub="كل ما تحتاجه لكوب V60 نظيف"
          href="/products/?cat=drip"
        />
      )}
      <NewArrivals />
      <BestSellers />
      <JournalTeaser />
      <StartHere />
    </div>
  );
}
