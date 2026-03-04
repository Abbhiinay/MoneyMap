 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserCurrency } from "@/lib/useUserCurrency";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Expense = {
  id: string;
  amount: number;
  date?: string;
  created_at?: string;
};

type MonthlyPoint = {
  key: string;
  month: string;
  total: number;
};

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const { currency, loading: currencyLoading } = useUserCurrency();

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: true });

      if (data) {
        setExpenses(
          data.map((exp: any) => ({
            id: exp.id,
            amount: Number(exp.amount),
            date: exp.date,
            created_at: exp.created_at,
          }))
        );
      }
    };

    void fetchExpenses();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const now = new Date();

    const months: MonthlyPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push({
        key,
        month: d.toLocaleString("default", { month: "short" }),
        total: 0,
      });
    }

    const bucketMap = new Map<string, MonthlyPoint>(
      months.map((m) => [m.key, m])
    );

    expenses.forEach((exp) => {
      const rawDate = exp.date ?? exp.created_at;
      if (!rawDate) return;
      const expDate = new Date(rawDate);
      if (Number.isNaN(expDate.getTime())) return;

      const key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.total += Number(exp.amount);
      }
    });

    return months;
  }, [expenses]);

  const hasData = monthlyData.some((m) => m.total > 0);

  if (currencyLoading) {
    return (
      <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          Analytics
        </h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Deep-dive into where your money goes with category trends, cashflow
          projections, and savings insights.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Monthly Spending Trend
              </p>
            </div>

            <div className="mt-4 h-64">
              {!hasData ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 transition-colors dark:bg-slate-900/80 dark:text-slate-400">
                  No spending data for the last 12 months.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-slate-200 dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(value) => formatCurrency(value as number)}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                      formatter={(value) =>
                        formatCurrency(value as number)
                      }
                      labelFormatter={(label) => label}
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderRadius: 12,
                        border: "1px solid rgba(30,41,59,0.7)",
                        padding: "8px 10px",
                      }}
                      labelStyle={{ fontSize: 11, color: "#e2e8f0" }}
                      itemStyle={{ fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#6366F1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Category breakdown
            </p>
            <div className="mt-4 grid gap-3 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                <span>Housing</span>
                <span className="font-medium text-slate-100">32%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                <span>Food & Groceries</span>
                <span className="font-medium text-slate-100">21%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                <span>Transport</span>
                <span className="font-medium text-slate-100">11%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                <span>Fun & Travel</span>
                <span className="font-medium text-slate-100">14%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Savings & runway
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Emergency fund</span>
                <span className="font-semibold text-emerald-400">4.2 months</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-slate-200 transition-colors dark:bg-slate-900">
                <div className="h-2 w-3/5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Based on average expenses in the last 6 months.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Insights & alerts
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <li className="rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                Dining out is up{" "}
                <span className="font-semibold text-emerald-400">18%</span>{" "}
                versus last month.
              </li>
              <li className="rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                You&apos;re on track to hit your savings goal by{" "}
                <span className="font-semibold text-emerald-400">
                  October
                </span>
                .
              </li>
              <li className="rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80">
                2 subscriptions haven&apos;t been used in 60 days.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

