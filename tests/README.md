# MoneyMap Functionality Testing Framework

This directory (`/tests`) contains the test suites for functionality testing of the **MoneyMap** personal finance and group bill splitting application.

The test framework uses Node.js's native test runner (`node:test` + `node:assert/strict`) with native TypeScript type-stripping (`--experimental-strip-types`). It requires **zero external test dependencies**, executes within milliseconds, and provides clear, deterministic test results.

---

## 📋 Test Suites Overview

| Suite | File | Target Feature / SRS Mapping | Description |
| :--- | :--- | :--- | :--- |
| **Suite 1** | `tests/personal-expenses.test.ts` | **FR-3, FR-4, FR-5** (Personal Expense Management) | Validates expense creation, positive amount checks, required category enforcement, default date fallback, and category catalog completeness. |
| **Suite 2** | `tests/group-settlements.test.ts` | **FR-9, FR-11, FR-12, FR-13** (SplitMap & Debt Settlements) | Validates multi-member debt calculation (`computeNetDebtsFromExpenses`), debt netting between pairs, settlement payment deductions (`applySettlements`), and user balance status categorization. |
| **Suite 3** | `tests/email-detection.test.ts` | **FR-6, FR-7, FR-8** (Automated Email Detection & Parsing) | Validates currency & amount extraction from bank/UPI emails, merchant string parsing, rule-based category prediction, and IST timezone boundary computations. |
| **Suite 4** | `tests/analytics-engine.test.ts` | **FR-14, FR-15** (Analytics & Spending Trends) | Validates reverse-chronological month sorting, monthly daily spending aggregations, category trend break-downs, and robust date parsing with fallback. |
| **Suite 5** | `tests/invitations-validation.test.ts` | **FR-10, NFR-6** (Invitations & Offline Fallback) | Validates email syntax sanitization, self-invitation prevention, casing normalization, and schema integrity of offline local storage invitations. |
| **Suite 6** | `tests/api-contracts.test.ts` | **System Architecture & API Endpoints** | Validates API contract response structures, health probe endpoints (`/api/health`), and standardized error response formatting. |

---

## 🚀 How to Run the Tests

### 1. Run All Test Suites
From the project root:
```bash
npm test
```
Or directly with Node.js:
```bash
node --no-warnings --test --experimental-strip-types tests/*.test.ts
```

### 2. Run Individual Test Suites
You can run any specific suite independently:

```bash
# Suite 1: Personal Expenses
npm run test:suite1

# Suite 2: Group Expense & Debt Settlements (SplitMap)
npm run test:suite2

# Suite 3: Automated Detection & Email Parsing
npm run test:suite3

# Suite 4: Analytics Engine
npm run test:suite4

# Suite 5: Invitations & Fallback Validation
npm run test:suite5

# Suite 6: API Response Contracts & Health
npm run test:suite6
```

---

## 🛠 Architectural Improvements
To facilitate isolated, reliable functionality testing without mocking the entire React DOM or Next.js server runtime, business logic functions have been decoupled into clean, pure utility modules:

- `moneymap/lib/splitUtils.ts` (SplitMap algorithm & debt matrix)
- `moneymap/lib/emailDetectionUtils.ts` (Email transaction parsing & IST time logic)
- `moneymap/lib/analyticsUtils.ts` (Spending trends, date calculations & aggregations)
- `moneymap/lib/expenseValidationUtils.ts` (Expense input validation & sanitization)
- `moneymap/lib/invitationUtils.ts` (Email invite filtering & normalization)
- `moneymap/lib/apiContracts.ts` (Payload schemas & contract validators)
