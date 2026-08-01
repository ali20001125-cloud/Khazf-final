/** صفحة هبوط للإعلانات — منتج واحد، مسار مستقيم، بلا قائمة ولا مخارج */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/server/catalog";
import LandingClient from "./LandingClient";

export const dynamic = "force-dynamic";

// لا تُفهرس — صفحة إعلانية لمن يملك الرابط فقط
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const coffee = catalog.coffees.find((c) => c.slug === slug);
  if (!coffee) notFound();

  return <LandingClient coffee={coffee} />;
}
