"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 opacity-0">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        <span className="text-sm text-slate-500">Theme</span>
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-all duration-300 ${
          isDark 
            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" 
            : "bg-slate-400"
        }`}
      />
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}

