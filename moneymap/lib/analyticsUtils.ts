export const pad2 = (n: number) => String(n).padStart(2, "0");

export const parseExpenseDate = (exp: { date?: string | null; created_at?: string | null }) => {
  const rawDate = exp.date ?? exp.created_at;
  if (!rawDate) return null;
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

export const formatMonthLabel = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
};

export function getAvailableMonths(transactions: Array<{ date?: string | null; created_at?: string | null }>) {
  const months = new Set<string>();
  transactions.forEach((tx) => {
    const d = parseExpenseDate(tx);
    if (!d) return;
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    months.add(key);
  });
  return Array.from(months).sort((a, b) => (a < b ? 1 : -1));
}

export function getDailySpendingForMonth(
  transactions: Array<{ date?: string | null; created_at?: string | null; amount: number }>,
  month: string
) {
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

export function getCategoryTrendForMonth(
  transactions: Array<{ date?: string | null; created_at?: string | null; category?: string | null; amount: number }>,
  month: string
) {
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
    const dayIndex = d.getDate() - 1;
    byCategory[cat][dayIndex] += Number(tx.amount) || 0;
  });

  return Object.fromEntries(
    Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b))
  );
}
