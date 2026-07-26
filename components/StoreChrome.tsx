"use client";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFab from "@/components/WhatsAppFab";

/**
 * عناصر واجهة المتجر (هيدر/فوتر/واتساب) — تظهر للزبائن فقط.
 * تُخفى تماماً عن لوحة الإدارة (/admin) حتى لا تلتبس قائمة المتجر
 * بقائمة الإدارة، خصوصاً على الهاتف.
 */
export default function StoreChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/alikhazf25");

  if (isAdmin) {
    // لوحة الإدارة تدير هيكلها بنفسها (AdminShell) — بلا كروم المتجر
    return <main>{children}</main>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
