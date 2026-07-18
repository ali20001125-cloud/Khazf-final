"use client";

/** الكتالوج الحي — يُملأ من القاعدة في layout ويصل لكل مكوّنات العميل */
import { createContext, useContext } from "react";
import type { Coffee, Tool } from "@/lib/data";
import type { PromoBanner } from "@/lib/server/catalog";

export interface CatalogValue {
  coffees: Coffee[];
  tools: Tool[];
  boxGiftNames: string[];
  banners: PromoBanner[];
  toolsEnabled: boolean;
}

const Ctx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ value, children }: { value: CatalogValue; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog خارج المزوّد");
  return v;
}
