"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { BoxTier } from "@/lib/server/db/schema";
import { fbTrack } from "@/lib/fbpixel";

/* ═══════ إعدادات الموقع (تصل من القاعدة عبر layout) ═══════ */
export interface SiteConfig {
  deliveryPrice: number;
  freeDeliveryThreshold: number;
  pointValue: number;
  cashbackPerAmount: number;
  cashbackPct: number;
  boxTiers: BoxTier[];
  boxDiscountCap: number;
  homeCropsCount: number;
  homeBestsellerSlug: string | null;
  topBarMessages: string[];
  instagram: string | null;
  logoUrl: string | null;
}
const SiteConfigContext = createContext<SiteConfig | null>(null);
export const useSiteConfig = () => {
  const c = useContext(SiteConfigContext);
  if (!c) throw new Error("useSiteConfig خارج المزوّد");
  return c;
};

/* ═══════ سلة حقيقية: الهوية = slug + variant (الخادم يتجاهل الأسعار) ═══════ */
export type CartVariant = "G250" | "G500" | "G1000" | "PIECE";

export interface CartItem {
  key: string; // slug|variant|grind|boxGroup
  slug: string;
  variant: CartVariant;
  grind?: string;
  name: string;
  meta?: string;
  priceShown: number; // للعرض فقط — الحساب النهائي من الخادم
  qty: number;
  boxGroup?: number;
  bundleId?: string;   // حزمة «خذها معاً» — تُضاف وتُحذف ككتلة
  variantId?: number | null;    // خيار المنتج (مقاس/عبوة/لون)
  variantLabel?: string | null; // اسم الخيار للعرض
}

export interface AppliedCoupon {
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_DELIVERY";
  value: number;
}

interface StoreState {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "qty" | "key">, qty?: number, silent?: boolean) => void;
  removeFromCart: (key: string) => void;
  convertToBox: () => void;
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  bump: number;
  useCashback: boolean;
  setUseCashback: (v: boolean) => void;
  coupon: AppliedCoupon | null;
  setCoupon: (c: AppliedCoupon | null) => void;
  boxGiftChoice: string | null;
  setBoxGiftChoice: (g: string | null) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  recent: string[];
  pushRecent: (id: string) => void;
}

const StoreContext = createContext<StoreState | null>(null);

const keyOf = (i: Omit<CartItem, "qty" | "key">) =>
  [i.slug, i.variant, i.grind ?? "", i.boxGroup ?? "", i.variantId ?? "", i.bundleId ?? ""].join("|");

export function StoreProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: SiteConfig;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartLoaded = useRef(false);

  /* السلة تعيش بعد إغلاق المتصفح */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("khz_cart_v1");
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    cartLoaded.current = true;
  }, []);
  useEffect(() => {
    if (!cartLoaded.current) return;
    try { localStorage.setItem("khz_cart_v1", JSON.stringify(cart)); } catch {}
  }, [cart]);
  const [toast, setToast] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  // حالة استخدام الكاش تُحفظ — حتى لا تضيع بين السلة والدفع أو عند تحديث الصفحة
  const [useCashback, setUseCashbackState] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem("khz_use_cashback") === "1") setUseCashbackState(true); } catch {}
  }, []);
  const setUseCashback = useCallback((v: boolean) => {
    setUseCashbackState(v);
    try { sessionStorage.setItem("khz_use_cashback", v ? "1" : "0"); } catch {}
  }, []);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [boxGiftChoice, setBoxGiftChoice] = useState<string | null>(null);
  // المفضلة والمشاهدات تُحفظ محلياً — كانت تضيع عند أي تنقّل أو تحديث
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const f = localStorage.getItem("khz_favs_v1");
      if (f) setFavorites(JSON.parse(f));
      const r = localStorage.getItem("khz_recent_v1");
      if (r) setRecent(JSON.parse(r));
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("khz_favs_v1", JSON.stringify(favorites)); } catch {}
  }, [favorites]);
  useEffect(() => {
    try { localStorage.setItem("khz_recent_v1", JSON.stringify(recent)); } catch {}
  }, [recent]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecent((p) => [id, ...p.filter((x) => x !== id)].slice(0, 6));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const addToCart = useCallback(
    (item: Omit<CartItem, "qty" | "key">, qty = 1, silent = false) => {
      const key = keyOf(item);
      setCart((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
        return [...prev, { ...item, key, qty }];
      });
      setBump((b) => b + 1);
      if (!silent) showToast(`أُضيف «${item.name}» إلى السلة`);
      fbTrack("AddToCart", {
        content_name: item.name, content_ids: [item.slug],
        content_type: "product", value: item.priceShown * qty, currency: "IQD",
      });
    },
    [showToast]
  );

  /** يحوّل أكياس القهوة العادية (٢٥٠غ) إلى بوكس واحد — ليُطبَّق خصم الكمية */
  const convertToBox = useCallback(() => {
    setCart((prev) => {
      const group = Date.now();
      return prev.map((i) =>
        i.variant === "G250" && i.boxGroup == null
          ? { ...i, boxGroup: group, key: [i.slug, i.variant, i.grind ?? "", group, i.variantId ?? ""].join("|") }
          : i
      );
    });
  }, []);

  /* حذف بند — وإن كان جزءاً من حزمة، تُحذف الحزمة كاملة */
  const removeFromCart = useCallback(
    (key: string) => setCart((p) => {
      const it = p.find((i) => i.key === key);
      if (it?.bundleId) return p.filter((i) => i.bundleId !== it.bundleId);
      return p.filter((i) => i.key !== key);
    }),
    []
  );

  /* تغيير الكمية — الحزمة تتغيّر ككتلة */
  const setQty = useCallback(
    (key: string, qty: number) =>
      setCart((p) => {
        const it = p.find((i) => i.key === key);
        if (it?.bundleId) {
          if (qty <= 0) return p.filter((i) => i.bundleId !== it.bundleId);
          return p.map((i) => (i.bundleId === it.bundleId ? { ...i, qty } : i));
        }
        return qty <= 0 ? p.filter((i) => i.key !== key) : p.map((i) => (i.key === key ? { ...i, qty } : i));
      }),
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon(null);
    setUseCashback(false);
    setBoxGiftChoice(null);
  }, []);

  return (
    <SiteConfigContext.Provider value={config}>
      <StoreContext.Provider
        value={{
          cart, addToCart, removeFromCart, setQty, clearCart, convertToBox,
          toast, showToast, bump,
          useCashback, setUseCashback,
          coupon, setCoupon,
          boxGiftChoice, setBoxGiftChoice,
          favorites, toggleFavorite,
          recent, pushRecent,
        }}
      >
        {children}
      </StoreContext.Provider>
    </SiteConfigContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/* حساب معاينة البوكس بالعميل — نفس مصدر الحقيقة (boxTiers من الإعدادات) */
export function boxPreview(cart: CartItem[], tiers: BoxTier[]) {
  const boxLines = cart.filter((i) => i.boxGroup != null && i.variant === "G250");
  const bags = boxLines.reduce((t, i) => t + i.qty, 0);
  const subtotal = boxLines.reduce((t, i) => t + i.priceShown * i.qty, 0);
  let pct = 0, freeDelivery = false, gift = false;
  for (const t of tiers)
    if (bags >= t.bags) {
      if (t.rewardType === "PERCENT") pct = Math.max(pct, t.value ?? 0);
      if (t.rewardType === "FREE_DELIVERY") freeDelivery = true;
      if (t.rewardType === "GIFT") gift = true;
    }
  const rawDiscount = Math.round((subtotal * pct) / 100);
  // الإجمالي بعد الخصم يتقرّب لأعلى ٢٥٠ (رقم يُدفع بالورق) — الزبون يبقى وافّراً
  const afterRaw = Math.max(0, subtotal - rawDiscount);
  const afterRounded = Math.ceil(afterRaw / 250) * 250;
  const discount = subtotal - afterRounded;
  return { bags, discount: Math.max(0, discount), pct, freeDelivery, gift };
}

export function GlobalToast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="toast-in fixed bottom-24 start-1/2 z-[70] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-bg shadow-xl">
      {toast}
    </div>
  );
}
