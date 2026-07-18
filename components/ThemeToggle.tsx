"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export type Theme = "light" | "dark" | "system";

function apply(t: Theme) {
  const dark =
    t === "dark" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme((localStorage.getItem("khazf-theme") as Theme) || "light");
  }, []);

  useEffect(() => {
    apply(theme);
    localStorage.setItem("khazf-theme", theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => apply("system");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [theme]);

  return { theme, setTheme };
}

const opts: { key: Theme; label: string; Icon: typeof Sun }[] = [
  { key: "light", label: "فاتح", Icon: Sun },
  { key: "dark", label: "داكن", Icon: Moon },
  { key: "system", label: "النظام", Icon: Monitor },
];

/* زر الهيدر — يبدّل بالتسلسل */
export function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const idx = opts.findIndex((o) => o.key === theme);
  const cur = opts[idx === -1 ? 1 : idx];
  const next = opts[(idx + 1) % opts.length].key;
  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`المظهر: ${cur.label}`}
      title={`المظهر: ${cur.label}`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-bg-alt active:scale-90"
    >
      <cur.Icon size={18} />
    </button>
  );
}

/* المبدّل الثلاثي — للقائمة الجانبية */
export function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex rounded-full border border-line bg-bg-alt p-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => setTheme(o.key)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-bold transition-all ${
            theme === o.key ? "bg-bg text-ink shadow-sm" : "text-muted"
          }`}
        >
          <o.Icon size={13} /> {o.label}
        </button>
      ))}
    </div>
  );
}
