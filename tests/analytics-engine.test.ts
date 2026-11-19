import test from "node:test";
import assert from "node:assert/strict";
import {
  parseExpenseDate,
  formatMonthLabel,
  getAvailableMonths,
  getDailySpendingForMonth,
  getCategoryTrendForMonth,
} from "../moneymap/lib/analyticsUtils.ts";

test("Suite 4: Analytics & Aggregation Engine", async (t) => {
  await t.test("parses expense date from date or created_at with fallback", () => {
    // Standard date string
    const d1 = parseExpenseDate({ date: "2026-11-16" });
    assert.ok(d1 instanceof Date);
    assert.equal(d1?.getFullYear(), 2026);

    // Fallback to created_at when date is null
    const d2 = parseExpenseDate({ date: null, created_at: "2026-08-10T14:30:00Z" });
    assert.ok(d2 instanceof Date);
    assert.equal(d2?.getUTCMonth(), 7); // August (0-indexed 7)

    // Invalid date returns null
    const d3 = parseExpenseDate({ date: "not-a-valid-date" });
    assert.equal(d3, null);

    const d4 = parseExpenseDate({ date: null, created_at: null });
    assert.equal(d4, null);
  });

  await t.test("formats month string to human-readable label", () => {
    const label = formatMonthLabel("2026-11");
    assert.ok(label.includes("November"));
    assert.ok(label.includes("2026"));
  });

  await t.test("extracts and sorts available months in reverse chronological order", () => {
    const transactions = [
      { date: "2026-01-15", amount: 50 },
      { date: "2026-11-02", amount: 120 },
      { date: "2026-05-20", amount: 30 },
      { date: "2026-11-15", amount: 80 }, // Duplicate month
    ];

    const months = getAvailableMonths(transactions);
    assert.deepEqual(months, ["2026-11", "2026-05", "2026-01"]);
  });

  await t.test("computes daily spending for a specified month correctly", () => {
    // November has 30 days
    const transactions = [
      { date: "2026-11-03", amount: 100 },
      { date: "2026-11-03", amount: 50 }, // Same day (total 150)
      { date: "2026-11-20", amount: 200 },
      { date: "2026-10-15", amount: 999 }, // Different month (should be excluded)
    ];

    const daily = getDailySpendingForMonth(transactions, "2026-11");
    assert.equal(daily.length, 30);
    assert.equal(daily[2], 150); // Day 3 is index 2
    assert.equal(daily[19], 200); // Day 20 is index 19
    assert.equal(daily[0], 0); // Day 1
  });

  await t.test("computes category trend breakdown sorted alphabetically", () => {
    const transactions = [
      { date: "2026-11-05", amount: 40, category: "Food" },
      { date: "2026-11-05", amount: 60, category: "Travel" },
      { date: "2026-11-10", amount: 30, category: "Food" },
    ];

    const trend = getCategoryTrendForMonth(transactions, "2026-11");
    const categoriesFound = Object.keys(trend);

    assert.deepEqual(categoriesFound, ["Food", "Travel"]);
    assert.equal(trend["Food"][4], 40); // 5th is index 4
    assert.equal(trend["Food"][9], 30); // 10th is index 9
    assert.equal(trend["Travel"][4], 60);
  });
});
