import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAmountAndMerchant,
  predictCategory,
  istParts,
  istDateKey,
  istGmailDateQuery,
  isSameIstDay,
} from "../moneymap/lib/emailDetectionUtils.ts";

test("Suite 3: Automated Email Transaction Detection & Parsing", async (t) => {
  await t.test("extracts amount and merchant from standard bank receipt text", () => {
    const text1 = "Your account was debited by INR 350.00 for order to Swiggy";
    const parsed1 = extractAmountAndMerchant(text1);
    assert.equal(parsed1.amount, 350);
    assert.equal(parsed1.merchant, "Swiggy");

    const text2 = "Paid ₹1,499.50 to Uber India via UPI";
    const parsed2 = extractAmountAndMerchant(text2);
    assert.equal(parsed2.amount, 1499.5);
    assert.ok(parsed2.merchant?.includes("Uber"));

    const text3 = "Spent at Starbucks Rs. 420 using Credit Card";
    const parsed3 = extractAmountAndMerchant(text3);
    assert.equal(parsed3.amount, 420);
    assert.ok(parsed3.merchant?.includes("Starbucks"));
  });

  await t.test("returns null when no amount is present in text", () => {
    const text = "Your monthly statement is ready for download";
    const parsed = extractAmountAndMerchant(text);
    assert.equal(parsed.amount, null);
  });

  await t.test("predicts category accurately based on merchant rules", () => {
    assert.equal(predictCategory("Swiggy Orders"), "Food");
    assert.equal(predictCategory("Zomato Ltd"), "Food");
    assert.equal(predictCategory("Uber Rides"), "Transport");
    assert.equal(predictCategory("Ola Cabs"), "Transport");
    assert.equal(predictCategory("Amazon Retail"), "Shopping");
    assert.equal(predictCategory("Flipkart Internet"), "Shopping");
    assert.equal(predictCategory("Netflix monthly"), "Subscription");
    assert.equal(predictCategory("Spotify Premium"), "Subscription");
    assert.equal(predictCategory("Blinkit Express"), "Grocery");
    assert.equal(predictCategory("Airtel Broadband"), "Bills");
    assert.equal(predictCategory("BookMyShow Movies"), "Entertainment");
    assert.equal(predictCategory("Apollo Pharmacy"), "Health");
    assert.equal(predictCategory("Unknown Hardware Store"), "Uncategorized");
  });

  await t.test("extracts amounts and merchants with broader international and structured tags", () => {
    const textUsd = "Payment of $49.99 to GitHub Enterprise";
    const parsedUsd = extractAmountAndMerchant(textUsd);
    assert.equal(parsedUsd.amount, 49.99);
    assert.ok(parsedUsd.merchant?.includes("GitHub"));

    const textEur = "Your card was charged €12.50 at Spotify";
    const parsedEur = extractAmountAndMerchant(textEur);
    assert.equal(parsedEur.amount, 12.5);
    assert.ok(parsedEur.merchant?.includes("Spotify"));

    const textGbp = "Transaction of £85.00 with Apple Store";
    const parsedGbp = extractAmountAndMerchant(textGbp);
    assert.equal(parsedGbp.amount, 85);
    assert.ok(parsedGbp.merchant?.includes("Apple"));

    const textVpa = "VPA: blinkit@hdfcbank Rs 299";
    const parsedVpa = extractAmountAndMerchant(textVpa);
    assert.equal(parsedVpa.amount, 299);
    assert.ok(parsedVpa.merchant?.includes("blinkit"));
  });

  await t.test("handles Indian Standard Time (IST) offset correctly", () => {
    // 2026-11-16 at 20:00:00 UTC is 2026-11-17 at 01:30:00 IST (+5:30 hrs)
    const lateUtcDate = new Date("2026-11-16T20:00:00Z");
    const parts = istParts(lateUtcDate);

    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 10); // 0-indexed month (10 = November)
    assert.equal(parts.day, 17); // Rolled over to 17th in IST

    const key = istDateKey(lateUtcDate);
    assert.equal(key, "2026-11-17");

    const query = istGmailDateQuery(lateUtcDate);
    assert.equal(query, "2026/11/17");
  });

  await t.test("evaluates isSameIstDay correctly across boundaries", () => {
    const d1 = new Date("2026-11-16T02:00:00Z"); // 07:30 IST on 16th
    const d2 = new Date("2026-11-16T15:00:00Z"); // 20:30 IST on 16th
    const d3 = new Date("2026-11-16T22:00:00Z"); // 03:30 IST on 17th

    assert.equal(isSameIstDay(d1, d2), true);
    assert.equal(isSameIstDay(d1, d3), false);
  });
});
