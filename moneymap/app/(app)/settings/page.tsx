"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
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
