export type ExpenseInput = {
  amount: number | string;
  category: string;
  description?: string;
  date?: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  sanitized?: {
    amount: number;
    category: string;
    description: string;
    date: string;
  };
};

export const VALID_CATEGORIES = [
  "Food",
  "Grocery",
  "Laundry",
  "Stationery",
  "Travel",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Other",
] as const;

export function validateExpense(input: ExpenseInput): ValidationResult {
  const errors: string[] = [];
  const numAmount = Number(input.amount);

  if (Number.isNaN(numAmount) || numAmount <= 0) {
    errors.push("Amount must be a positive number greater than 0");
  }

  const category = (input.category || "").trim();
  if (!category) {
    errors.push("Category is required");
  }

  const date = input.date ? input.date.trim() : new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("Date must be in YYYY-MM-DD format");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      amount: Math.round(numAmount * 100) / 100,
      category,
      description: (input.description || "").trim(),
      date,
    },
  };
}
