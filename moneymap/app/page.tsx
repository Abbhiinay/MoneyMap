export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/60">
              <span className="text-sm font-semibold text-emerald-400">MM</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Money<span className="text-emerald-400">Map</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-emerald-400">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-emerald-400">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="rounded-full border border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900">
              Login
            </button>
            <button className="hidden rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 md:inline-flex">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-12 lg:px-8 lg:pt-20">
        {/* Hero */}
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Track every dollar. Split every bill.
            </div>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
              Map your money,
              <span className="block text-emerald-400">master your splits.</span>
            </h1>

            <p className="mt-4 max-w-xl text-balance text-sm text-slate-300 sm:text-base">
              MoneyMap brings together personal expense tracking, real‑time
              analytics, and effortless group splitting so you always know where
              your money is going&mdash;solo or with friends.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400">
                Get Started
              </button>
              <span className="text-xs text-slate-400 sm:text-sm">
                No credit card required. Set up in under 2 minutes.
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_55%)]" />
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-emerald-500/10 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  This month&apos;s overview
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  +18.4% healthier
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-800">
                  <p className="text-slate-400">Total spend</p>
                  <p className="mt-1 text-base font-semibold text-slate-50">
                    $2,450
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-800">
                  <p className="text-slate-400">Tracked bills</p>
                  <p className="mt-1 text-base font-semibold text-slate-50">
                    38
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-800">
                  <p className="text-slate-400">SplitMap groups</p>
                  <p className="mt-1 text-base font-semibold text-slate-50">
                    6
                  </p>
                </div>
              </div>

              <div className="mt-5 h-28 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-emerald-400/10 to-transparent ring-1 ring-slate-800">
                <div className="flex h-full items-end gap-1 px-4 pb-3">
                  {[35, 60, 45, 80, 55, 72, 90].map((height, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-full bg-emerald-400/60"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                <span>Smart categories, real‑time insights.</span>
                <span className="text-emerald-400">Powered by MoneyMap</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="mt-20 border-t border-slate-800/80 pt-12 lg:mt-24"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                Everything you need to stay in control.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
                MoneyMap combines powerful budgeting tools with a delightful,
                minimal interface so managing money feels effortless.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="group rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-sm shadow-slate-950/40 transition hover:-translate-y-1 hover:border-emerald-500/70 hover:shadow-emerald-500/30">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/40">
                $
              </div>
              <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                Personal expense tracking
              </h3>
              <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                Connect accounts or add expenses in seconds. Tag, search, and
                organize spending across every part of your life.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-slate-400">
                <li>• Smart categories & rules</li>
                <li>• Recurring bills & reminders</li>
                <li>• Multicurrency support</li>
              </ul>
            </div>

            <div className="group rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-sm shadow-slate-950/40 transition hover:-translate-y-1 hover:border-emerald-500/70 hover:shadow-emerald-500/30">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/40">
                ⧉
              </div>
              <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                Analytics dashboard
              </h3>
              <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                See trends, burn rate, and category breakdowns at a glance with
                a dashboard built for fast, clear decisions.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-slate-400">
                <li>• Monthly & weekly insights</li>
                <li>• Savings and runway tracking</li>
                <li>• Export‑ready reports</li>
              </ul>
            </div>

            <div className="group rounded-3xl border border-slate-800/80 bg-slate-950/60 p-6 shadow-sm shadow-slate-950/40 transition hover:-translate-y-1 hover:border-emerald-500/70 hover:shadow-emerald-500/30">
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/40">
                ∞
              </div>
              <h3 className="text-sm font-semibold text-slate-50 sm:text-base">
                Group splitting with SplitMap
              </h3>
              <p className="mt-2 text-xs text-slate-300 sm:text-sm">
                Trips, roommates, side projects—SplitMap keeps every shared
                expense fair, transparent, and automatically balanced.
              </p>
              <ul className="mt-4 space-y-1 text-xs text-slate-400">
                <li>• Real‑time group balances</li>
                <li>• Flexible splits & paybacks</li>
                <li>• Clear history for every group</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing teaser (anchor target) */}
        <section
          id="pricing"
          className="mt-20 rounded-3xl border border-slate-800/80 bg-slate-950/60 px-6 py-8 text-center shadow-lg shadow-slate-950/60 sm:px-10 lg:mt-24"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Simple pricing
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
            Start free. Upgrade when money matters most.
          </h2>
          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            Get all the core MoneyMap features on our free plan. Unlock advanced
            analytics and unlimited SplitMap groups when you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm text-slate-300 sm:flex-row sm:gap-6">
            <div>
              <span className="text-3xl font-semibold text-slate-50">
                $0
              </span>
              <span className="ml-2 text-xs text-slate-400">forever free</span>
            </div>
            <span className="hidden h-6 w-px bg-slate-800 sm:inline-block" />
            <p className="text-xs text-slate-400 sm:text-sm">
              Pro starts at{" "}
              <span className="font-medium text-emerald-400">$7 / month</span>.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {new Date().getFullYear()} MoneyMap. All rights reserved.</p>
          <div className="flex gap-4">
            <button className="transition hover:text-slate-300">
              Privacy
            </button>
            <button className="transition hover:text-slate-300">
              Terms
            </button>
            <button className="transition hover:text-slate-300">
              Support
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
