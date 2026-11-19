import test from "node:test";
import assert from "node:assert/strict";
import {
  validateExpense,
  VALID_CATEGORIES,
} from "../moneymap/lib/expenseValidationUtils.ts";
import { categories } from "../moneymap/data/categories.ts";

test("Suite 1: Personal Expense Management", async (t) => {
  await t.test("accepts a valid expense input with proper sanitization", () => {
    const input = {
      amount: "149.50",
      category: "Food",
      description: "Dinner with team",
      date: "2026-11-16",
    };

    const result = validateExpense(input);
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
    assert.deepEqual(result.sanitized, {
      amount: 149.5,
      category: "Food",
      description: "Dinner with team",
      date: "2026-11-16",
    });
  });

  await t.test("rejects invalid or non-positive amounts", () => {
    const negativeResult = validateExpense({
      amount: -50,
      category: "Food",
    });
    assert.equal(negativeResult.isValid, false);
    assert.ok(negativeResult.errors.some((e) => e.includes("positive number")));

    const nanResult = validateExpense({
      amount: "invalid-number",
      category: "Food",
    });
    assert.equal(nanResult.isValid, false);
    assert.ok(nanResult.errors.some((e) => e.includes("positive number")));
  });

  await t.test("rejects empty category", () => {
    const emptyCategoryResult = validateExpense({
      amount: 100,
      category: "   ",
    });
    assert.equal(emptyCategoryResult.isValid, false);
    assert.ok(emptyCategoryResult.errors.some((e) => e.includes("Category is required")));
  });

  await t.test("applies default date when date is not provided", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const result = validateExpense({
      amount: 45,
      category: "Grocery",
    });

    assert.equal(result.isValid, true);
    assert.equal(result.sanitized?.date, todayIso);
  });

  await t.test("verifies system predefined categories exist", () => {
    const categoryNames = categories.map((c) => c.name);
    assert.ok(categoryNames.includes("Food"));
    assert.ok(categoryNames.includes("Grocery"));
    assert.ok(categoryNames.includes("Bills"));
    assert.ok(categoryNames.length >= 5);
  });
});
