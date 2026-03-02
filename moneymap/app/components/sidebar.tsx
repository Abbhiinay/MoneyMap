"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/analytics" },
  { label: "Groups", href: "/groups" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800/80 bg-slate-950/90 px-4 py-5">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/60">
          <span className="text-sm font-semibold text-emerald-400">MM</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-50">
          Money<span className="text-emerald-400">Map</span>
        </span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1 text-sm">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/60"
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-50"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-3 text-xs text-slate-400">
        <p className="font-medium text-slate-200">Today&apos;s snapshot</p>
        <p className="mt-1 text-[11px] text-slate-400">
          You&apos;re on track with this month&apos;s budget. Keep an eye on
          shared group expenses.
        </p>
      </div>
    </aside>
  );
}

