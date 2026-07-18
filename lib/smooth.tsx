"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";

/** تمرير سلس بـ Lenis — يُعطَّل تلقائياً لمن يفضّل تقليل الحركة */
export default function Smooth({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
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
