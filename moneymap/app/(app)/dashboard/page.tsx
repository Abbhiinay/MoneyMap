"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);

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
    fetchExpenses();
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
        date: new Date(),
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
          <input
            type="text"
            placeholder="Category"
            className="rounded-lg border p-2 text-sm dark:bg-slate-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description"
            className="rounded-lg border p-2 text-sm dark:bg-slate-900"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <p className="mt-2 text-2xl font-semibold">${monthlyTotal}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500">Total Expenses</p>
          <p className="mt-2 text-2xl font-semibold">
            ${totalOverall}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-4 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500">Entries</p>
          <p className="mt-2 text-2xl font-semibold">{expenses.length}</p>
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
                  -${exp.amount}
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

