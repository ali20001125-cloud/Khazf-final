"use client";

import { useState } from "react";
import { PackageSearch, Check, Truck, Home, XCircle } from "lucide-react";
import { formatIQD } from "@/lib/data";
import { useMotion } from "@/lib/motion";

type Result = { orderNumber: string; status: "CONFIRMED" | "DELIVERED" | "CANCELLED"; total: number };

export default function TrackPage() {
  const scope = useMotion();
  const [num, setNum] = useState("");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: num, phone }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "لم نجد الطلب");
      else setRes(d);
    } catch { setErr("تعذّر الاتصال"); }
    setBusy(false);
  };

  const steps = res && [
    { Icon: Check, t: "تم التأكيد", d: "طلبك مسجَّل وقيد التجهيز", done: true },
    { Icon: Truck, t: "بالطريق", d: "مع مندوب التوصيل", done: res.status === "DELIVERED", active: res.status === "CONFIRMED" },
    { Icon: Home, t: "تم التوصيل", d: "استلمته ودفعت كاش", done: res.status === "DELIVERED" },
  ];

  return (
    <div ref={scope} className="mx-auto max-w-xl px-4 pb-24 pt-32 md:px-6">
      <h1 className="reveal text-3xl font-bold md:text-4xl">تتبع طلبك</h1>
      <form onSubmit={submit} className="reveal mt-8 space-y-3">
        <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="رقم الطلب — KHZ-1001" dir="ltr"
          className="font-num w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-sm outline-none focus:border-accent" />
        <div className="flex gap-2">
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="رقم هاتف الطلب" inputMode="tel" dir="ltr" maxLength={11}
            className="font-num w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-end text-sm outline-none focus:border-accent" />
          <button type="submit" disabled={busy} className="btn btn-olive shrink-0 !px-6 !py-3.5 text-sm disabled:opacity-50">
            <PackageSearch size={16} />
          </button>
        </div>
      </form>

      {err && <p className="mt-6 rounded-[14px] bg-accent/10 px-5 py-3.5 text-center text-sm font-bold text-accent">{err}</p>}

      {res && (
        <div className="mt-8 rounded-[22px] border border-line bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="font-num text-sm font-bold">{res.orderNumber}</p>
            <p className="font-num text-sm font-bold">{formatIQD(res.total)}</p>
          </div>

          {res.status === "CANCELLED" ? (
            <p className="mt-5 flex items-center gap-2 rounded-[14px] bg-accent/10 px-4 py-3.5 text-sm font-bold text-accent">
              <XCircle size={17} /> هذا الطلب أُلغي — تواصل معنا لأي استفسار
            </p>
          ) : (
            <div className="mt-6">
              {steps!.map((s, i) => (
                <div key={s.t} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      s.done ? "border-ok bg-ok text-olive-text" : s.active ? "border-accent text-accent ring-4 ring-accent/15" : "border-line bg-bg text-muted"
                    }`}>
                      <s.Icon size={15} />
                    </span>
                    {i < steps!.length - 1 && <span className={`h-10 w-0.5 ${s.done ? "bg-ok" : "bg-line"}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-bold ${s.active ? "text-accent" : ""}`}>{s.t}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
