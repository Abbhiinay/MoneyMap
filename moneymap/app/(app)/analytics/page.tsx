export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Analytics
        </h1>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Deep-dive into where your money goes with category trends, cashflow
          projections, and savings insights.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">
                Monthly burn rate
              </p>
              <span className="text-[11px] text-emerald-400">
                Placeholder chart
              </span>
            </div>
            <div className="mt-4 h-40 rounded-xl bg-slate-900/80" />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Category breakdown
            </p>
            <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
                <span>Housing</span>
                <span className="font-medium text-slate-100">32%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
                <span>Food & Groceries</span>
                <span className="font-medium text-slate-100">21%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
                <span>Transport</span>
                <span className="font-medium text-slate-100">11%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-900/80 px-3 py-2">
                <span>Fun & Travel</span>
                <span className="font-medium text-slate-100">14%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Savings & runway
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>Emergency fund</span>
                <span className="font-semibold text-emerald-400">4.2 months</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-900">
                <div className="h-2 w-3/5 rounded-full bg-emerald-400" />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Based on average expenses in the last 6 months.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Insights & alerts
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="rounded-lg bg-slate-900/80 px-3 py-2">
                Dining out is up{" "}
                <span className="font-semibold text-emerald-400">18%</span>{" "}
                versus last month.
              </li>
              <li className="rounded-lg bg-slate-900/80 px-3 py-2">
                You&apos;re on track to hit your savings goal by{" "}
                <span className="font-semibold text-emerald-400">
                  October
                </span>
                .
              </li>
              <li className="rounded-lg bg-slate-900/80 px-3 py-2">
                2 subscriptions haven&apos;t been used in 60 days.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

