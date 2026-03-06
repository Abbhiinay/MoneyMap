"use client";

import { useState, useEffect } from "react";
import { categories } from "@/data/categories";

export type ExpenseForEdit = {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
};

type Props = {
  expense: ExpenseForEdit;
  onSave: (payload: {
    amount: number;
    category: string;
    description: string;
    date: string;
  }) => void;
  onCancel: () => void;
  formatCurrency?: (value: number) => string;
  currency?: string;
};

export function EditExpenseModal({
  expense,
  onSave,
  onCancel,
}: Props) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category || "");
  const [description, setDescription] = useState(expense.description || "");
  const [date, setDate] = useState(
    expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    setAmount(String(expense.amount));
    setCategory(expense.category || "");
    setDescription(expense.description || "");
    setDate(
      expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
    );
  }, [expense]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (Number.isNaN(num) || num < 0) return;
    onSave({
      amount: num,
      category: category || "Other",
      description: description.trim(),
      date: date || new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-all duration-300 ease-in-out"
      aria-modal="true"
      role="dialog"
      aria-labelledby="edit-expense-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="edit-expense-title"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          Edit Expense
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="e.g. Lunch"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
