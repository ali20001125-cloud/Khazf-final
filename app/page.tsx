"use client";

import PromoBanners from "@/components/scenes/PromoBanners";
import { useMotion } from "@/lib/motion";
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

  return (
    <div ref={scope}>
      <Hero />
      <PromoBanners />
      <CropsRail />
      <BoxTeaser />
      <ToolsSection
        cat="إسبريسو"
        title="أدوات الإسبريسو"
        sub="من التامبر إلى البيتشر — عدّة الشوت المثالي"
        href="/products/?cat=espresso"
      />
      <StatementBanner />
      <ToolsSection
        cat="تقطير"
        title="أدوات التقطير"
        sub="كل ما تحتاجه لكوب V60 نظيف"
        href="/products/?cat=drip"
      />
      <NewArrivals />
      <BestSellers />
      <JournalTeaser />
      <StartHere />
    </div>
  );
}
