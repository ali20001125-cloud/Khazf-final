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
  topBarMessages: [], instagram: "khazf.roaster",
};

const EMPTY_CATALOG: CatalogData = { coffees: [], tools: [], places: [], boxGiftNames: [], banners: [] };

async function loadCatalog(): Promise<CatalogData> {
  try {
    return await getCatalog();
  } catch {
    return EMPTY_CATALOG;
  }
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
    };
  } catch {
    return FALLBACK; // القاعدة غير متاحة (بناء/عطل) — المتجر يبقى واقفاً
  }
}

export const metadata: Metadata = {
  title: "خزف — قهوة مختصة",
  description: "محاصيل مختارة من إثيوبيا والبرازيل وكولومبيا وغواتيمالا — تُحمَّص باستمرار وتوصل لكل محافظات العراق. قهوةٌ صُنعت بصبر، لمن يعرف قيمة التوقّف.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [config, catalog] = await Promise.all([loadConfig(), loadCatalog()]);
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
      </body>
    </html>
  );
}
