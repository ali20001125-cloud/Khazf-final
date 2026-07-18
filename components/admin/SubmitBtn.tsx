"use client";
import { useFormStatus } from "react-dom";

export default function SubmitBtnClient({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className={`rounded-[12px] px-5 py-2.5 text-[13px] font-bold text-olive-text transition-all active:scale-[0.97] disabled:opacity-60 ${danger ? "bg-accent" : "bg-olive"}`}>
      {pending ? "جارٍ الحفظ…" : children}
    </button>
  );
}
