"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/analytics" },
  { label: "Groups", href: "/groups" },
  { label: "Settings", href: "/settings" },
];

type DetectedTransaction = {
  id: string;
  amount: number;
  merchant: string;
  predictedCategory: string;
  source: string;
  date: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [detected, setDetected] = useState<DetectedTransaction[]>([]);
  const [loadingDetected, setLoadingDetected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetected = async () => {
      setLoadingDetected(true);
      try {
        const res = await fetch("/api/gmail/today-transactions");
        if (!res.ok) return;
        const json = await res.json();
        const items: DetectedTransaction[] = json.detected ?? [];
        setDetected(items);
        if (items.length > 0) {
          setGmailConnected(true);
        }
      } finally {
        setLoadingDetected(false);
      }
    };
    void fetchDetected();
  }, []);

  const handleSyncGmail = async () => {
    setSyncError(null);
    setLoadingDetected(true);

    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setSyncError("Gmail integration is not configured.");
        return;
      }

      const loadScript = () =>
        new Promise<void>((resolve, reject) => {
          if (typeof window === "undefined") {
            reject(new Error("Window is not available"));
            return;
          }
          if ((window as any).google?.accounts?.oauth2) {
            resolve();
            return;
          }
          const existing = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
          );
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), {
              once: true,
            });
            return;
          }
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load Google script"));
          document.head.appendChild(script);
        });

      await loadScript();

      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        setSyncError("Google OAuth is not available in this browser.");
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/gmail.readonly",
          callback: async (tokenResponse: any) => {
            if (!tokenResponse?.access_token) {
              setSyncError("Failed to obtain Gmail access token.");
              reject(new Error("No access token"));
              return;
            }
            try {
              const res = await fetch("/api/gmail/today-transactions", {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });
              if (!res.ok) {
                const text = await res.text();
                setSyncError("Failed to sync Gmail transactions.");
                reject(new Error(text));
                return;
              }
              const json = await res.json();
              const items: DetectedTransaction[] = json.detected ?? [];
              setDetected(items);
              setGmailConnected(true);
              resolve();
            } catch (err) {
              setSyncError("Unexpected error syncing Gmail.");
              reject(err as Error);
            }
          },
        });
        client.requestAccessToken();
      });
    } catch (err) {
      if (!syncError) {
        setSyncError("Unable to start Gmail sync.");
      }
    } finally {
      setLoadingDetected(false);
    }
  };

  return (
    <aside className="sticky top-0 z-30 flex w-full flex-col border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 transition-colors dark:border-slate-800/80 dark:bg-slate-950/90 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:py-5">
      <div className="flex items-center gap-2 px-1 lg:px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/60">
          <span className="text-sm font-semibold text-emerald-500">MM</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-50">
          Money<span className="text-emerald-400">Map</span>
        </span>
      </div>

      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm lg:mt-8 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition lg:shrink ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/60 dark:text-emerald-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400 md:block">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Today&apos;s snapshot
          </p>
          <button
            type="button"
            onClick={handleSyncGmail}
            className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
            disabled={loadingDetected}
          >
            {gmailConnected ? "Sync Gmail" : "Connect Gmail"}
          </button>
        </div>

        {loadingDetected && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Checking for today&apos;s Gmail transactions...
          </p>
        )}

        {!loadingDetected && detected.length === 0 && (
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {gmailConnected
              ? "No transactions detected today."
              : "Connect Gmail to automatically detect today&apos;s transactions."}
          </p>
        )}

        {!loadingDetected && detected.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Detected transactions today:
            </p>
            {detected.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-white/70 px-2 py-1.5 text-[11px] text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    ₹{tx.amount.toFixed(0)} - {tx.merchant}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Category: {tx.predictedCategory}
                  </p>
                </div>
                <Link
                  href={`/dashboard?detectedId=${encodeURIComponent(tx.id)}`}
                  className="ml-2 shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}

        {syncError && (
          <p className="mt-1 text-[11px] text-red-500">{syncError}</p>
        )}
      </div>
    </aside>
  );
}
