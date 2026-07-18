"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) router.push("/admin/");
    else setErr((await r.json()).error ?? "فشل الدخول");
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-[80svh] max-w-sm flex-col items-center justify-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive text-olive-text">
        <Lock size={22} />
      </div>
      <h1 className="mt-5 text-2xl font-bold">لوحة خزف</h1>
      <p className="mt-1 text-[13px] text-muted">دخول المالك فقط</p>
      <form onSubmit={submit} className="mt-8 w-full space-y-3">
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور" autoFocus
          className="w-full rounded-[14px] border border-line bg-card px-4 py-3.5 text-sm outline-none focus:border-accent"
        />
        {err && <p className="text-center text-[12px] font-bold text-accent">{err}</p>}
        <button disabled={busy} className="btn btn-olive w-full !py-3.5 text-sm disabled:opacity-50">
          {busy ? "…" : "دخول"}
        </button>
      </form>
      <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">
        عند تفعيل Supabase بالإنتاج يتحوّل الدخول تلقائياً إلى Google
      </p>
    </div>
  );
}
