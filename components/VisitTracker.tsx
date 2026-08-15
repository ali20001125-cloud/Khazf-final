"use client";
/** يرسل زيارة كل تغيّر مسار — صامت، خفيف، بلا أي أثر بصري */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function sessionId(): string {
  const KEY = "khz_sid";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function device(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // لا نتتبّع لوحة الإدارة — ونضع علامة دائمة أن هذا جهاز المدير
    if (pathname?.startsWith("/alikhazf25")) {
      try { localStorage.setItem("khazf_is_admin", "1"); } catch {}
      return;
    }
    // جهاز المدير (زار اللوحة سابقاً) — لا نحسب زياراته للمتجر
    try { if (localStorage.getItem("khazf_is_admin") === "1") return; } catch {}
    // نضمّ الـ query (?c=المنتج · وسوم UTM للإعلانات) — يُثري رحلة الزائر
    const search = typeof window !== "undefined" ? window.location.search : "";
    const fullPath = (pathname ?? "") + (search || "");
    const body = JSON.stringify({
      sessionId: sessionId(),
      path: fullPath,
      referrer: document.referrer || null,
      device: device(),
    });
    // نرسل صامتاً (بلا انتظار)
    fetch("/api/track/view/", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [pathname]);
  return null;
}
