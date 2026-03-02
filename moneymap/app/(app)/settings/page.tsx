export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
          Settings
        </h1>
        <p className="max-w-xl text-sm text-slate-300 sm:text-base">
          Configure how MoneyMap works for you—from currencies and categories to
          notifications and connected accounts.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Profile & preferences
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <p className="pt-1 text-[11px]">
                Placeholder fields for name, email, and default currency.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Categories & rules
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <p className="pt-1 text-[11px]">
                Placeholder for customizing spending categories and auto-tagging
                rules.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Notifications
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <div className="h-8 rounded-lg bg-slate-900/80" />
              <p className="pt-1 text-[11px]">
                Placeholder toggles for alerts on budgets, group settlements, and
                unusual spend.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
            <p className="text-xs font-medium text-slate-300">
              Danger zone
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Space reserved for account deletion and data export controls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

