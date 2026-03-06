"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserCurrency } from "@/lib/useUserCurrency";
import { categories } from "@/data/categories";
import { EditExpenseModal } from "@/app/components/EditExpenseModal";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ExpenseItem = {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at?: string;
};

export default function DashboardPage() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expenseDate, setExpenseDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [editingTransaction, setEditingTransaction] = useState<ExpenseItem | null>(null);
  const { currency, loading: currencyLoading } = useUserCurrency();

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setExpenses(
        data.map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          category: e.category ?? "",
          description: e.description ?? "",
          date: e.date ? new Date(e.date).toISOString().slice(0, 10) : "",
          created_at: e.created_at,
        }))
      );
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const handleSaveEdit = async (payload: {
    amount: number;
    category: string;
    description: string;
    date: string;
  }) => {
    if (!editingTransaction) return;
    await supabase
      .from("expenses")
      .update({
        amount: payload.amount,
        category: payload.category,
        description: payload.description,
        date: payload.date,
      })
      .eq("id", editingTransaction.id);
    setEditingTransaction(null);
    fetchExpenses();
  };

  useEffect(() => {
    void fetchExpenses();
  }, []);

  const handleAddExpense = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("expenses").insert([
      {
        user_id: user.id,
        amount: Number(amount),
        category,
        description,
        date: expenseDate,
      },
    ]);

    setAmount("");
    setCategory("");
    setDescription("");

    fetchExpenses();
  };
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyTotal = expenses
    .filter((exp) => {
      const expDate = new Date(exp.date);
      return (
        expDate.getMonth() === currentMonth &&
        expDate.getFullYear() === currentYear
      );
    })
    .reduce((acc, exp) => acc + Number(exp.amount), 0);
  
  const totalOverall = expenses.reduce(
    (acc, exp) => acc + Number(exp.amount),
    0
  );
  const monthlyExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return (
      expDate.getMonth() === currentMonth &&
      expDate.getFullYear() === currentYear
    );
  });
  
  const categoryData = Object.values(
    monthlyExpenses.reduce((acc: any, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = { name: categories.find(c => c.name === exp.category)?.name || exp.category, value: 0 };
      }
      acc[exp.category].value += Number(exp.amount);
      return acc;
    }, {})
  );
  const COLORS = [
    "#6366F1",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#A855F7",
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);

  if (currencyLoading) {
    return (
      <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Loading dashboard preferences...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          High-level view of your spend and balances across MoneyMap.
        </p>
      </div>

      {/* Add Expense */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800/80 dark:bg-slate-950/80">
  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">
    Add Expense
  </p>

  <div className="grid gap-3 sm:grid-cols-5 items-center">

    <input
      type="number"
      placeholder="Amount"
      className="rounded-lg border p-2 text-sm dark:bg-slate-900"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
    />

    <select
      className="rounded-lg border p-2 text-sm dark:bg-slate-900"
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      aria-label="Category"
    >
      <option value="">Select Category</option>
      {categories.map((c) => (
        <option key={c.name} value={c.name}>
          {c.icon} {c.name}
        </option>
      ))}
    </select>

    <input
      type="date"
      value={expenseDate}
      onChange={(e) => setExpenseDate(e.target.value)}
      className="rounded-lg border p-2 text-sm dark:bg-slate-900"
    />

    <input
      type="text"
      placeholder="Description"
      className="rounded-lg border p-2 text-sm dark:bg-slate-900"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
    />

    <button
      onClick={handleAddExpense}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
    >
      Add
    </button>

  </div>
</div>
      {/* Stat Cards (still placeholder for now) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500">This month</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(monthlyTotal)}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalOverall)}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500">Entries</p>
          <p className="mt-2 text-2xl font-semibold">{expenses.length}</p>
        </div>
      </div>
      {/* Spending by Category */}
<div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
    Spending by category
  </p>

  <div className="mt-4 h-64">
    {categoryData.length === 0 ? (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No expense data yet.
      </p>
    ) : (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryData}
            dataKey="value"
            nameKey="name"
            outerRadius={80}
            label
          >
            {categoryData.map((entry: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
</div>
      {/* Recent Activity (Real Data Now) */}
      <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Recent activity
        </p>

        <div className="mt-3 space-y-2 text-xs">
          {expenses.length === 0 ? (
            <p>No expenses yet.</p>
          ) : (
            expenses.map((exp) => {
              const cat = categories.find((c) => c.name === exp.category);
              const icon = cat?.icon ?? "📦";
              const dateLabel = exp.date
                ? new Date(exp.date + "T12:00:00").toLocaleDateString("default", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—";
              return (
                <div
                  key={exp.id}
                  className="flex flex-col gap-1 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {icon} {exp.category || "Other"}
                      </p>
                      {exp.description && (
                        <p className="truncate text-slate-600 dark:text-slate-400">
                          {exp.description}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {dateLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        -{formatCurrency(Number(exp.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingTransaction(exp)}
                        className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {editingTransaction && (
          <EditExpenseModal
            expense={editingTransaction}
            onSave={handleSaveEdit}
            onCancel={() => setEditingTransaction(null)}
          />
        )}
      </div>
    </div>
  );
}

