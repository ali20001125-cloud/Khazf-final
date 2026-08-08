"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setErr(false);
    const r = await fetch("/api/staging-auth/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass }),
    });
    if (r.ok) { window.location.href = next; return; }
    setErr(true); setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1b1815] px-6">
      <div className="w-full max-w-[320px] text-center">
        <p className="font-num text-[10px] tracking-[0.4em] text-[#c9a961]">KHAZF · STAGING</p>
        <h1 className="mt-4 text-[22px] font-bold text-[#ede7dd]">بيئة الاختبار</h1>
        <p className="mt-2 text-[12.5px] text-[#a3968a]">هذه ليست المتجر — أدخل كلمة المرور</p>
        <input
          type="password" value={pass} dir="ltr"
          onChange={(e) => { setPass(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="كلمة المرور"
          className="mt-6 w-full rounded-[12px] border border-[#38312a] bg-[#242019] px-4 py-3 text-center text-[14px] text-[#ede7dd] outline-none focus:border-[#c9a961]"
        />
        {err && <p className="mt-2 text-[12px] font-bold text-[#c08a6e]">كلمة المرور غير صحيحة</p>}
        <button onClick={submit} disabled={busy}
          className="mt-3 w-full rounded-[12px] bg-[#c9a961] py-3 text-[14px] font-bold text-[#1b1815] disabled:opacity-50">
          {busy ? "…" : "دخول"}
        </button>
      </div>
    </div>
  );
}

export default function StagingLogin() {
  return <Suspense><LoginForm /></Suspense>;
}
