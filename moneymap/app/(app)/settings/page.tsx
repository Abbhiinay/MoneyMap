"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserCurrency } from "@/lib/useUserCurrency";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { currency, loading: currencyLoading, error, updateCurrency } =
    useUserCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<string>("USD");
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email ?? null);
      }
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  useEffect(() => {
    if (currency) {
      setSelectedCurrency(currency);
    }
  }, [currency]);

  return (
    <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Configure how MoneyMap works for you—from currencies and categories to
          notifications and connected accounts.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* LEFT SIDE */}
        <div className="space-y-4">
          {/* Profile & preferences */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Profile & preferences
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Email
                </p>
                <p className="font-medium">{userEmail}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  User ID
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                  (Fetched securely from Supabase)
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Default currency
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    disabled={currencyLoading}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                  <button
                    onClick={() => updateCurrency(selectedCurrency)}
                    disabled={currencyLoading}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {currencyLoading ? "Saving..." : "Save currency"}
                  </button>
                </div>
                {error && (
                  <p className="mt-1 text-[11px] text-red-500">{error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Categories placeholder */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Categories & rules
            </p>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Placeholder for customizing spending categories and auto-tagging
              rules.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-4">
          {/* Notifications placeholder */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Notifications
            </p>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Placeholder toggles for alerts on budgets and group settlements.
            </p>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-300/60 bg-white p-4 dark:border-red-800/60 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              Danger zone
            </p>

            <div className="mt-4">
              <button
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
