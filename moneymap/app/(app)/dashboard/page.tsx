"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserCurrency } from "@/lib/useUserCurrency";
import { categories } from "@/data/categories";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const { currency, loading: currencyLoading } = useUserCurrency();

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setExpenses(data);
  };

  const handleDeleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
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
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="number"
            placeholder="Amount"
            className="rounded-lg border p-2 text-sm dark:bg-slate-900"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
       <select
  className="category-select"
  value={category}
  onChange={(e) => setCategory(e.target.value)}
>
  <option value="">Select Category</option>
  <option>🍔 Food</option>
  <option>🛒 Grocery</option>
  <option>🧺 Laundry</option>
  <option>✏️ Stationery</option>
  <option>✈️ Travel</option>
  <option>🛍 Shopping</option>
  <option>💡 Bills</option>
  <option>🎬 Entertainment</option>
  <option>💊 Health</option>
  <option>📦 Other</option>
</select>
          <input
            type="text"
            placeholder="Description"
            className="rounded-lg border p-2 text-sm dark:bg-slate-900"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
<input
  type="date"
  value={expenseDate}
  onChange={(e) => setExpenseDate(e.target.value)}
  className="expense-date"
/>
        </div>
        <button
          onClick={handleAddExpense}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
        >
          Add
        </button>
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
            expenses.map((exp) => (
              <div
              key={exp.id}
              className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-900/80"
            >
              <span>
                {exp.category} · {exp.description}
              </span>
            
              <div className="flex items-center gap-3">
                <span className="font-medium text-emerald-400">
                  -{formatCurrency(Number(exp.amount))}
                </span>
            
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

