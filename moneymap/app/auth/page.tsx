export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-2xl shadow-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/60">
            <span className="text-sm font-semibold text-emerald-400">MM</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-50">
            Money<span className="text-emerald-400">Map</span>
          </span>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-50">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to access your dashboard, analytics, and SplitMap groups.
        </p>

        <div className="mt-6 space-y-3 text-xs text-slate-400">
          <div className="h-10 rounded-xl bg-slate-900/80" />
          <div className="h-10 rounded-xl bg-slate-900/80" />
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-900/80" />
              <span>Remember me</span>
            </div>
            <button className="text-xs text-slate-300 underline-offset-2 hover:underline">
              Forgot password?
            </button>
          </div>
          <button className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400">
            Continue
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          By continuing you agree to the MoneyMap Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

