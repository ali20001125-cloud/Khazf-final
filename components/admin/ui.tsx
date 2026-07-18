/** لبنات واجهة اللوحة — سيرفر-صديقة */
import type { ReactNode } from "react";

export const money = (n: number) => `${n.toLocaleString("en")} د.ع`;
export const dateAr = (d: Date | string) =>
  new Date(d).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[18px] border border-line bg-card ${className}`}>{children}</div>;
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-start text-[11px] font-bold text-muted ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-[13px] ${className}`}>{children}</td>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { t: string; c: string }> = {
    CONFIRMED: { t: "بانتظار التوصيل", c: "bg-gold/15 text-gold" },
    DELIVERED: { t: "تم التوصيل", c: "bg-ok/12 text-ok" },
    CANCELLED: { t: "ملغى", c: "bg-accent/12 text-accent" },
    PENDING: { t: "بانتظار الموافقة", c: "bg-gold/15 text-gold" },
    PUBLISHED: { t: "منشور", c: "bg-ok/12 text-ok" },
    HIDDEN: { t: "مخفي", c: "bg-bg-alt text-muted" },
  };
  const x = map[status] ?? { t: status, c: "bg-bg-alt text-muted" };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${x.c}`}>{x.t}</span>;
}

export const inputCls =
  "w-full rounded-[12px] border border-line bg-bg px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-accent";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

export { default as SubmitBtn } from "./SubmitBtn";
