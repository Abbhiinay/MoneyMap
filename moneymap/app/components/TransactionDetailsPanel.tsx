"use client";

import { categories } from "@/data/categories";

export type TransactionForPanel = {
  id: string;
  category?: string;
  description?: string;
  amount: number;
  date?: string;
};

type Props = {
  date: string | null;
  transactions: TransactionForPanel[];
  formatCurrency: (value: number) => string;
};

/**
 * Displays transactions for a selected date. Used beside the Daily Spending Trend chart.
 */
export function TransactionDetailsPanel({
  date,
  transactions,
  formatCurrency,
}: Props) {
  const getCategoryIcon = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.icon ?? "📦";
  };

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("default", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!date) return null;

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-300 ease-in-out dark:border-slate-800/80 dark:bg-slate-950/80 min-h-[200px] flex flex-col"
      role="region"
      aria-label={`Transactions on ${formatDateLabel(date)}`}
    >
      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3">
        Transactions on {formatDateLabel(date)}
      </h3>

      {transactions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No expenses recorded for this date.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-900/80"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {getCategoryIcon(t.category ?? "Other")} {t.category ?? "Other"}
                </span>
                {t.description && (
                  <p className="truncate text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {t.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-medium text-emerald-600 dark:text-emerald-400">
                {formatCurrency(Number(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
