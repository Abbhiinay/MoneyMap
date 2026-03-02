import type { ReactNode } from "react";
import Sidebar from "../components/sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex h-screen max-h-screen">
        <Sidebar />

        <div className="flex flex-1 flex-col border-l border-slate-800/80 bg-slate-950/90">
          <header className="flex h-14 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-medium">MoneyMap workspace</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <button className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
                Invite
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-slate-200 ring-1 ring-slate-700">
                MM
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

