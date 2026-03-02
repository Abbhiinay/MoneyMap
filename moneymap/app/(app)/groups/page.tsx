export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          SplitMap Groups
        </h1>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Keep every shared expense fair, transparent, and easy to settle across
          trips, households, and projects.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-300">Active groups</p>
            <button className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400">
              New group
            </button>
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2.5">
              <div>
                <p className="font-medium text-slate-100">Lisbon trip</p>
                <p className="text-[11px] text-slate-400">
                  8 members · 24 shared expenses
                </p>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-semibold text-emerald-400">You&apos;re owed</p>
                <p className="text-slate-100">+$86.40</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2.5">
              <div>
                <p className="font-medium text-slate-100">Roommates</p>
                <p className="text-[11px] text-slate-400">
                  3 members · Rent, utilities, groceries
                </p>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-semibold text-emerald-400">You owe</p>
                <p className="text-slate-100">-$42.10</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-2.5">
              <div>
                <p className="font-medium text-slate-100">Side project</p>
                <p className="text-[11px] text-slate-400">
                  2 members · Tools, hosting, ads
                </p>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-semibold text-emerald-400">Settled</p>
                <p className="text-slate-100">$0.00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Quick add expense
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <p className="pt-1 text-[11px]">
                Form placeholder for adding a shared expense to any group.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Settlement suggestions
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-300">
              <li className="rounded-lg bg-slate-900/80 px-3 py-2">
                Alex pays Jamie <span className="font-semibold">$24.10</span> to
                settle Lisbon trip.
              </li>
              <li className="rounded-lg bg-slate-900/80 px-3 py-2">
                Taylor pays you <span className="font-semibold">$18.30</span> for
                groceries.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

