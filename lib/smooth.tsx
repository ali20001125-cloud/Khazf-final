"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/** تمرير سلس بـ Lenis — يُعطَّل تلقائياً لمن يفضّل تقليل الحركة */
export default function Smooth({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // الهاتف له تمرير أصلي سلس — لا داعي لمكتبة تثقل التنفيذ (٩٠٪ من الزوار)
    if (window.matchMedia("(max-width: 1024px)").matches) { setEnabled(false); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setEnabled(false);
  }, []);

  if (!enabled) return <>{children}</>;

  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
