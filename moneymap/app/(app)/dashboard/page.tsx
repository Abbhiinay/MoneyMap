export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Dashboard
        </h1>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          High-level view of your spend, income, and shared balances across all
          of MoneyMap.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <p className="text-xs font-medium text-slate-400">This month</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">$2,450</p>
          <p className="mt-1 text-xs text-emerald-400">On track · 82% of plan</p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <p className="text-xs font-medium text-slate-400">
            Upcoming recurring
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">$640</p>
          <p className="mt-1 text-xs text-slate-400">
            Subscriptions, rent, utilities
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <p className="text-xs font-medium text-slate-400">Group balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">+$120</p>
          <p className="mt-1 text-xs text-slate-400">
            You&apos;re owed across SplitMap groups
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">
              Spending by category
            </p>
            <span className="text-[11px] text-slate-500">Placeholder view</span>
          </div>
          <div className="mt-4 h-40 rounded-xl bg-slate-900/80" />
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <p className="text-xs font-medium text-slate-300">Recent activity</p>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
              <span>Groceries · Split with Roommates</span>
              <span className="font-medium text-emerald-400">-$84.20</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
              <span>Salary · Acme Corp</span>
              <span className="font-medium text-emerald-400">+$3,200.00</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
              <span>Coffee · Personal</span>
              <span className="font-medium text-emerald-400">-$4.50</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

