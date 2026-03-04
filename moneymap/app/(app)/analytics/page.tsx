 "use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserCurrency } from "@/lib/useUserCurrency";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Expense = {
  id: string;
  amount: number;
  category?: string;
  date?: string;
  created_at?: string;
};

// Example transaction dataset (for reference / testing shape)
// Matches: { id, amount, category, date: "YYYY-MM-DD" }
const exampleTransactions = [
  { id: 1, amount: 200, category: "Food", date: "2026-03-01" },
  { id: 2, amount: 0, category: "Food", date: "2026-03-02" },
  { id: 3, amount: 450, category: "Transport", date: "2026-03-03" },
  { id: 4, amount: 120, category: "Shopping", date: "2026-03-04" },
];

type MonthlyPoint = {
  key: string;
  month: string;
  total: number;
};

type YearlyPoint = {
  monthIndex: number;
  month: string;
  total: number;
};

type DailyPoint = {
  day: number;
  total: number;
};

export default function AnalyticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(
    () => new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const { currency, loading: currencyLoading } = useUserCurrency();
  const [heatmapTooltip, setHeatmapTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    dateLabel: string;
    amountLabel: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    dateLabel: "",
    amountLabel: "",
  });

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
            category: exp.category,
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

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const formatISODate = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

  const parseExpenseDate = (exp: Expense) => {
    const rawDate = exp.date ?? exp.created_at;
    if (!rawDate) return null;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const formatMonthLabel = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split("-").map(Number);
    const d = new Date(y, (m ?? 1) - 1, 1);
    return d.toLocaleString("default", { month: "long", year: "numeric" });
  };

  const spendingLevel = (amount: number) => {
    if (!amount || amount <= 0) return 0; // ₹0
    if (amount <= 200) return 1; // ₹1–₹200
    if (amount < 500) return 2; // ₹201–₹499
    return 3; // ₹500+
  };

  /**
   * Returns all months that contain transactions.
   * Output is "YYYY-MM" sorted newest -> oldest.
   */
  function getAvailableMonths(transactions: Expense[]) {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      const d = parseExpenseDate(tx);
      if (!d) return;
      const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      months.add(key);
    });
    return Array.from(months).sort((a, b) => (a < b ? 1 : -1));
  }

  /**
   * Returns an array of length = days in the given month, containing total spend per day.
   * Month is "YYYY-MM".
   */
  function getDailySpendingForMonth(transactions: Expense[], month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const y = year;
    const mIndex = (monthNum ?? 1) - 1;
    const daysInMonth = new Date(y, mIndex + 1, 0).getDate();
    const totals = Array.from({ length: daysInMonth }, () => 0);

    transactions.forEach((tx) => {
      const d = parseExpenseDate(tx);
      if (!d) return;
      if (d.getFullYear() !== y || d.getMonth() !== mIndex) return;
      const dayIndex = d.getDate() - 1;
      totals[dayIndex] += Number(tx.amount) || 0;
    });

    return totals;
  }

  /**
   * Returns per-category daily arrays for a given month.
   * Month is "YYYY-MM".
   */
  function getCategoryTrendForMonth(transactions: Expense[], month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const y = year;
    const mIndex = (monthNum ?? 1) - 1;
    const daysInMonth = new Date(y, mIndex + 1, 0).getDate();

    const byCategory: Record<string, number[]> = {};

    transactions.forEach((tx) => {
      const d = parseExpenseDate(tx);
      if (!d) return;
      if (d.getFullYear() !== y || d.getMonth() !== mIndex) return;

      const cat = tx.category || "Uncategorized";
      if (!byCategory[cat]) {
        byCategory[cat] = Array.from({ length: daysInMonth }, () => 0);
      }
      byCategory[cat][d.getDate() - 1] += Number(tx.amount) || 0;
    });

    // Ensure stable ordering when iterating keys
    return Object.fromEntries(
      Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b))
    );
  }

  // Last 12 months (existing bar chart)
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
      const expDate = parseExpenseDate(exp);
      if (!expDate) return;

      const key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.total += Number(exp.amount);
      }
    });

    return months;
  }, [expenses]);

  // Available years from expense data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expenses.forEach((exp) => {
      const d = parseExpenseDate(exp);
      if (!d) return;
      years.add(d.getFullYear());
    });

    const list = Array.from(years).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!list.includes(currentYear)) {
      list.unshift(currentYear);
    }
    return list;
  }, [expenses]);

  // Yearly spending trend (Jan–Dec for selected year)
  const yearlyData: YearlyPoint[] = useMemo(() => {
    const months: YearlyPoint[] = Array.from(
      { length: 12 },
      (_, monthIndex) => ({
        monthIndex,
        month: new Date(selectedYear, monthIndex, 1).toLocaleString("default", {
          month: "short",
        }),
        total: 0,
      })
    );

    expenses.forEach((exp) => {
      const expDate = parseExpenseDate(exp);
      if (!expDate) return;
      if (expDate.getFullYear() !== selectedYear) return;

      const monthIndex = expDate.getMonth();
      months[monthIndex].total += Number(exp.amount);
    });

    return months;
  }, [expenses, selectedYear]);

  const hasData = monthlyData.some((m) => m.total > 0);

  // Month dropdown + daily/category trends (driven by selectedMonth)
  const availableMonths = useMemo(() => {
    const fromData = getAvailableMonths(expenses);
    const now = new Date();
    const current = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    const withoutCurrent = fromData.filter((m) => m !== current);
    return [current, ...withoutCurrent];
  }, [expenses]);

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const dailyTotalsForSelectedMonth = useMemo(
    () => getDailySpendingForMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  );

  const dailyTrendData: DailyPoint[] = useMemo(
    () =>
      dailyTotalsForSelectedMonth.map((total, idx) => ({
        day: idx + 1,
        total,
      })),
    [dailyTotalsForSelectedMonth]
  );

  const categoryTrend = useMemo(
    () => getCategoryTrendForMonth(expenses, selectedMonth),
    [expenses, selectedMonth]
  );

  const categoryTrendChartData = useMemo(() => {
    const days = dailyTotalsForSelectedMonth.length;
    const categories = Object.keys(categoryTrend);
    return Array.from({ length: days }, (_, idx) => {
      const point: Record<string, number> & { day: number } = { day: idx + 1 };
      categories.forEach((cat) => {
        point[cat] = categoryTrend[cat]?.[idx] ?? 0;
      });
      return point;
    });
  }, [categoryTrend, dailyTotalsForSelectedMonth.length]);

  const categoryColors = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#A855F7",
    "#10B981",
    "#F97316",
  ];

  // Heatmap: aggregate current month spending by day (GitHub-style grid)
  const heatmap = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const startWeekday = monthStart.getDay(); // 0 (Sun) .. 6 (Sat)

    const dailyTotals: Record<string, number> = {};
    expenses.forEach((exp) => {
      const d = parseExpenseDate(exp);
      if (!d) return;
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return;
      const iso = formatISODate(d);
      dailyTotals[iso] = (dailyTotals[iso] ?? 0) + Number(exp.amount);
    });

    const cells: Array<
      | { kind: "blank"; key: string }
      | {
          kind: "day";
          key: string;
          iso: string;
          date: Date;
          total: number;
          level: number;
        }
    > = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ kind: "blank", key: `blank-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const iso = formatISODate(date);
      const total = dailyTotals[iso] ?? 0;
      cells.push({
        kind: "day",
        key: iso,
        iso,
        date,
        total,
        level: spendingLevel(total),
      });
    }

    const monthTitle = now.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });

    const monthTotal = Object.values(dailyTotals).reduce((a, b) => a + b, 0);

    return {
      monthTitle,
      daysInMonth,
      monthTotal,
      cells,
    };
  }, [expenses]);

  // Derived insights
  const totalOverall = expenses.reduce(
    (acc, exp) => acc + Number(exp.amount),
    0
  );

  const monthKeysWithSpend = new Set<string>();
  expenses.forEach((exp) => {
    const d = parseExpenseDate(exp);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthKeysWithSpend.add(key);
  });

  const monthsWithData = monthKeysWithSpend.size;
  const averageMonthlySpend =
    monthsWithData > 0 ? totalOverall / monthsWithData : 0;

  // Top spending category (overall)
  const topCategory = useMemo(() => {
    const byCategory = expenses.reduce(
      (acc: Record<string, number>, exp) => {
        if (!exp.category) return acc;
        acc[exp.category] = (acc[exp.category] ?? 0) + Number(exp.amount);
        return acc;
      },
      {}
    );

    let bestCategory: string | null = null;
    let bestTotal = 0;

    Object.entries(byCategory).forEach(([cat, total]) => {
      if (total > bestTotal) {
        bestTotal = total;
        bestCategory = cat;
      }
    });

    if (!bestCategory) return null;

    return {
      category: bestCategory,
      total: bestTotal,
    };
  }, [expenses]);

  // Current-month total for budget progress
  const budget = 1000;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthTotal = expenses.reduce((acc, exp) => {
    const d = parseExpenseDate(exp);
    if (!d) return acc;
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return acc + Number(exp.amount);
    }
    return acc;
  }, 0);

  const budgetUsage = budget > 0 ? (currentMonthTotal / budget) * 100 : 0;
  const clampedBudgetUsage = Math.min(100, Math.max(0, budgetUsage));

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

      {/* Month Dropdown (drives daily + category charts) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Select Month
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Daily spending trend (selected month) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Daily Spending Trend
              </p>
            </div>

            <div className="mt-4 h-64">
              {expenses.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 transition-colors dark:bg-slate-900/80 dark:text-slate-400">
                  No spending data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyTrendData}
                    margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-slate-200 dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(value) =>
                        formatCurrency(value as number)
                      }
                    />
                    <Tooltip
                      cursor={{
                        stroke: "rgba(99,102,241,0.35)",
                        strokeWidth: 1,
                      }}
                      formatter={(value) =>
                        formatCurrency(value as number)
                      }
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderRadius: 12,
                        border: "1px solid rgba(30,41,59,0.7)",
                        padding: "8px 10px",
                      }}
                      labelStyle={{ fontSize: 11, color: "#e2e8f0" }}
                      itemStyle={{ fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Spending Trend (selected month) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Category Spending Trend
              </p>
            </div>

            <div className="mt-4 h-64">
              {expenses.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 transition-colors dark:bg-slate-900/80 dark:text-slate-400">
                  No spending data yet.
                </div>
              ) : Object.keys(categoryTrend).length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 transition-colors dark:bg-slate-900/80 dark:text-slate-400">
                  No category activity in this month.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={categoryTrendChartData}
                    margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-slate-200 dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="day"
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
                      cursor={{
                        stroke: "rgba(99,102,241,0.25)",
                        strokeWidth: 1,
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderRadius: 12,
                        border: "1px solid rgba(30,41,59,0.7)",
                        padding: "8px 10px",
                      }}
                      labelStyle={{ fontSize: 11, color: "#e2e8f0" }}
                      itemStyle={{ fontSize: 11, color: "#e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />

                    {Object.keys(categoryTrend).map((cat, idx) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={categoryColors[idx % categoryColors.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Yearly spending trend (selectable year) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Yearly Spending Trend
              </p>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={yearlyData}
                  margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                >
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
                    cursor={{ stroke: "rgba(99,102,241,0.4)", strokeWidth: 1 }}
                    formatter={(value) => formatCurrency(value as number)}
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
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 1, stroke: "#0f172a" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily heatmap (current month) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Daily Spending Heatmap
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {heatmap.monthTitle} • {heatmap.daysInMonth} days •{" "}
                  {formatCurrency(heatmap.monthTotal)} spent
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Less</span>
                <span className="h-3 w-3 rounded-[3px] border border-slate-900/5 bg-slate-200 dark:border-slate-700/40 dark:bg-slate-800" />
                <span className="h-3 w-3 rounded-[3px] border border-slate-900/5 bg-emerald-200 dark:border-slate-700/40 dark:bg-emerald-900/40" />
                <span className="h-3 w-3 rounded-[3px] border border-slate-900/5 bg-emerald-400 dark:border-slate-700/40 dark:bg-emerald-600/70" />
                <span className="h-3 w-3 rounded-[3px] border border-slate-900/5 bg-emerald-600 dark:border-slate-700/40 dark:bg-emerald-500" />
                <span>More</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[42px_1fr] gap-3">
              <div className="grid grid-rows-7 gap-1 pt-[2px] text-[10px] text-slate-500 dark:text-slate-400">
                <div className="row-start-2 leading-3">Mon</div>
                <div className="row-start-4 leading-3">Wed</div>
                <div className="row-start-6 leading-3">Fri</div>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="grid w-max grid-flow-col auto-cols-[12px] grid-rows-7 gap-1">
                  {heatmap.cells.map((cell) => {
                    if (cell.kind === "blank") {
                      return (
                        <div
                          key={cell.key}
                          className="h-3 w-3 invisible"
                          aria-hidden="true"
                        />
                      );
                    }

                    const bg =
                      cell.level === 0
                        ? "bg-slate-200 dark:bg-slate-800"
                        : cell.level === 1
                          ? "bg-emerald-200 dark:bg-emerald-900/40"
                          : cell.level === 2
                            ? "bg-emerald-400 dark:bg-emerald-600/70"
                            : "bg-emerald-600 dark:bg-emerald-500";

                    return (
                      <div
                        key={cell.key}
                        role="button"
                        tabIndex={0}
                        aria-label={`${cell.iso}: ${formatCurrency(
                          cell.total
                        )} spent`}
                        className={[
                          "h-3 w-3 rounded-[3px] border border-slate-900/5 dark:border-slate-700/40",
                          bg,
                          "outline-none hover:outline hover:outline-2 hover:outline-indigo-500/50 hover:outline-offset-1",
                        ].join(" ")}
                        onMouseEnter={(e) => {
                          const dateLabel = cell.date.toLocaleString("default", {
                            month: "short",
                            day: "numeric",
                          });
                          const amountLabel = `${formatCurrency(
                            cell.total
                          )} spent`;
                          setHeatmapTooltip({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            dateLabel,
                            amountLabel,
                          });
                        }}
                        onMouseMove={(e) => {
                          setHeatmapTooltip((t) =>
                            t.visible
                              ? { ...t, x: e.clientX, y: e.clientY }
                              : t
                          );
                        }}
                        onMouseLeave={() => {
                          setHeatmapTooltip((t) => ({ ...t, visible: false }));
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tooltip (fixed) */}
            <div
              aria-hidden={!heatmapTooltip.visible}
              className={[
                "pointer-events-none fixed z-50 min-w-[140px] max-w-[220px] rounded-xl border border-slate-800/70 bg-slate-950/95 px-3 py-2 text-slate-100 shadow-2xl transition-opacity",
                heatmapTooltip.visible ? "opacity-100" : "opacity-0",
              ].join(" ")}
              style={{
                left: Math.min(
                  window.innerWidth - 240,
                  heatmapTooltip.x + 12
                ),
                top: Math.min(
                  window.innerHeight - 80,
                  heatmapTooltip.y + 12
                ),
              }}
            >
              <div className="text-xs font-semibold">
                {heatmapTooltip.dateLabel}
              </div>
              <div className="text-xs text-slate-200">
                {heatmapTooltip.amountLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Right-hand side placeholder cards (can evolve into more analytics later) */}
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

      {/* Insights below charts */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top category */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Top spending category
          </p>
          {topCategory ? (
            <div className="mt-3 space-y-1">
              <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                {topCategory.category}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatCurrency(topCategory.total)} spent overall
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Not enough data yet to determine a top category.
            </p>
          )}
        </div>

        {/* Average monthly spend */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Average monthly spend
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {formatCurrency(averageMonthlySpend)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Based on {monthsWithData || 0} month
            {monthsWithData === 1 ? "" : "s"} with activity.
          </p>
        </div>

        {/* Budget progress */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Budget progress (temporary)
          </p>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {formatCurrency(currentMonthTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              of {formatCurrency(budget)}
            </p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900">
            <div
              className="h-2 rounded-full bg-indigo-500 dark:bg-indigo-400"
              style={{ width: `${clampedBudgetUsage}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {clampedBudgetUsage.toFixed(0)}% of this month&apos;s{" "}
            {formatCurrency(budget)} budget used.
          </p>
        </div>
      </div>
    </div>
  );
}

