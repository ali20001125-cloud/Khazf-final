import type { Metadata } from "next";
import "./globals.css";
import Smooth from "@/lib/smooth";
import { StoreProvider, GlobalToast, type SiteConfig } from "@/lib/store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/server/settings";
import { getCatalog, type CatalogData } from "@/lib/server/catalog";
import { CatalogProvider } from "@/lib/catalog-context";

export const dynamic = "force-dynamic"; // متجر حي من القاعدة — لا تصيير مسبق

const FALLBACK: SiteConfig = {
  deliveryPrice: 3000, pointValue: 30, cashbackPerAmount: 1000,
  boxTiers: [
    { bags: 3, rewardType: "PERCENT", value: 10 },
    { bags: 4, rewardType: "PERCENT", value: 20 },
    { bags: 5, rewardType: "FREE_DELIVERY" },
    { bags: 6, rewardType: "GIFT" },
  ],
  topBarMessages: [], instagram: "khazf.roaster", logoUrl: null,
};

const EMPTY_CATALOG: CatalogData = { coffees: [], tools: [], places: [], boxGiftNames: [], banners: [] };

async function loadCatalog(): Promise<CatalogData> {
  try {
    return await getCatalog();
  } catch {
    return EMPTY_CATALOG;
  }
}

async function loadAnalytics() {
  try {
    const st = await getSettings();
    return { pixel: st.metaPixelId ?? null, ga: st.gaId ?? null };
  } catch { return { pixel: null, ga: null }; }
}

async function loadConfig(): Promise<SiteConfig> {
  try {
    const st = await getSettings();
    return {
      deliveryPrice: st.deliveryCustomerPrice,
      pointValue: st.pointValue,
      cashbackPerAmount: st.cashbackPerAmount,
      boxTiers: st.boxTiers,
      topBarMessages: st.topBarMessages,
      instagram: st.instagram,
      logoUrl: st.logoUrl ?? null,
    };
  } catch {
    return FALLBACK; // القاعدة غير متاحة (بناء/عطل) — المتجر يبقى واقفاً
  }
}

const SITE = process.env.SITE_URL ?? "https://plum-tapir-959252.hostingersite.com";
const DESC = "قهوة مختصة تُحمَّص باستمرار — محاصيل مختارة من إثيوبيا والبرازيل وكولومبيا، توصيل لكل محافظات العراق خلال يوم إلى يومين.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "خزف — قهوة مختصة", template: "%s · خزف" },
  description: DESC,
  keywords: ["خزف", "قهوة مختصة", "قهوة العراق", "قهوة اختصاص", "حبوب قهوة", "توصيل قهوة", "كالدي", "سيرادو", "الدورادو", "specialty coffee iraq"],
  applicationName: "خزف",
  openGraph: {
    type: "website", locale: "ar_IQ", siteName: "خزف",
    title: "خزف — قهوة مختصة", description: DESC, url: SITE,
  },
  twitter: { card: "summary_large_image", title: "خزف — قهوة مختصة", description: DESC },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [config, catalog, analytics] = await Promise.all([loadConfig(), loadCatalog(), loadAnalytics()]);
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("khazf-theme")||"light";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Tajawal:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <CatalogProvider
          value={{
            coffees: catalog.coffees,
            tools: catalog.tools,
            boxGiftNames: catalog.boxGiftNames,
            banners: catalog.banners,
            toolsEnabled: catalog.tools.length > 0,
            activePlaces: catalog.places.map((pl) => pl.slug),
          }}
        >
        <StoreProvider config={config}>
          <Smooth>
            <div className="grain" />
            <Header />
            <main>{children}</main>
            <Footer />
            <GlobalToast />
          </Smooth>
        </StoreProvider>
        </CatalogProvider>
        {analytics.ga && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${analytics.ga}');` }} />
          </>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "Store", name: "خزف",
          description: DESC, url: SITE, image: config.logoUrl || undefined,
          address: { "@type": "PostalAddress", addressCountry: "IQ" },
          priceRange: "IQD", servesCuisine: "قهوة مختصة",
        }) }} />
        {analytics.pixel && (
          <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${analytics.pixel}');fbq('track','PageView');` }} />
        )}
      </body>
    </html>
  );
}
