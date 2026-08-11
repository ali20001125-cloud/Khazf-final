"use client";
import { useEffect } from "react";

/**
 * تحميل مؤجَّل لسكربتات التتبّع (GA · Meta Pixel · Clarity).
 * تُحمَّل عند أول تفاعل للزبون أو بعد ٣ ثوانٍ — أيّهما أسبق —
 * فلا تخنق المعالج أثناء أول ظهور للصفحة (تحسين كبير للسرعة).
 * التتبّع يبقى شغّالاً، فقط يتأخّر لحظات عن العرض الأول.
 */
type Props = { ga?: string | null; pixel?: string | null; clarityId?: string | null; enabled: boolean };

export default function DeferredAnalytics({ ga, pixel, clarityId, enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof document !== "undefined" && document.cookie.includes("khz_no_track=1")) return;

    let done = false;
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;

    const inject = (code: string, src?: string) => {
      const s = document.createElement("script");
      if (src) { s.async = true; s.src = src; }
      else s.textContent = code;
      document.body.appendChild(s);
    };

    const load = () => {
      if (done) return;
      done = true;
      events.forEach((e) => window.removeEventListener(e, load));
      clearTimeout(timer);

      if (ga) {
        inject("", `https://www.googletagmanager.com/gtag/js?id=${ga}`);
        inject(`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${ga}',{send_page_view: !location.pathname.startsWith('/alikhazf25')});`);
      }
      if (pixel) {
        inject(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`);
      }
      if (clarityId) {
        inject(`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`);
      }
    };

    events.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));
    const timer = setTimeout(load, 3000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, load));
      clearTimeout(timer);
    };
  }, [ga, pixel, clarityId, enabled]);

  return null;
}
