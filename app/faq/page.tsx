"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqGeneral } from "@/lib/data";
import { useMotion } from "@/lib/motion";

export default function FaqPage() {
  const scope = useMotion();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div ref={scope} className="mx-auto max-w-2xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="reveal text-3xl font-bold md:text-4xl">الأسئلة الشائعة</h1>
      <div className="reveal mt-8 divide-y divide-line rounded-[20px] border border-line bg-card">
        {faqGeneral.map((f, i) => (
          <div key={f.q}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-start">
              <span className="text-[15px] font-bold">{f.q}</span>
              <ChevronDown size={17} className={`shrink-0 text-muted transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} />
            </button>
            <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: open === i ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-loose text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
