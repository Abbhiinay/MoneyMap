import test from "node:test";
import assert from "node:assert/strict";
import {
  computeNetDebtsFromExpenses,
  applySettlements,
  computeBalanceStatusForUser,
  type SplitExpense,
  type SettledPayment,
} from "../moneymap/lib/splitUtils.ts";

test("Suite 2: Group Expense & Debt Settlement (SplitMap)", async (t) => {
  await t.test("computes equal split between 2 members correctly", () => {
    // User A pays $100 for A and B ($50 each)
    const expenses: SplitExpense[] = [
      {
        payerId: "user-a",
        amount: 100,
        shares: [
          { memberId: "user-a", amount: 50 },
          { memberId: "user-b", amount: 50 },
        ],
      },
    ];

    const debts = computeNetDebtsFromExpenses({ expenses });

    assert.equal(debts.length, 1);
    assert.deepEqual(debts[0], {
      fromId: "user-b",
      toId: "user-a",
      amount: 50,
    });
  });

  await t.test("computes split among 3 members correctly", () => {
    // User A pays $300 for A, B, and C ($100 each)
    const expenses: SplitExpense[] = [
      {
        payerId: "user-a",
        amount: 300,
        shares: [
          { memberId: "user-a", amount: 100 },
          { memberId: "user-b", amount: 100 },
          { memberId: "user-c", amount: 100 },
        ],
      },
    ];

    const debts = computeNetDebtsFromExpenses({ expenses });

    assert.equal(debts.length, 2);
    const bDebt = debts.find((d) => d.fromId === "user-b");
    const cDebt = debts.find((d) => d.fromId === "user-c");

    assert.ok(bDebt);
    assert.equal(bDebt.toId, "user-a");
    assert.equal(bDebt.amount, 100);

    assert.ok(cDebt);
    assert.equal(cDebt.toId, "user-a");
    assert.equal(cDebt.amount, 100);
  });

  await t.test("nets bidirectional expenses between two members", () => {
    // Expense 1: User A pays $100 split with B ($50 share for B) -> B owes A $50
    // Expense 2: User B pays $40 split with A ($20 share for A) -> A owes B $20
    // Net result: B owes A ($50 - $20) = $30
    const expenses: SplitExpense[] = [
      {
        payerId: "user-a",
        amount: 100,
        shares: [
          { memberId: "user-a", amount: 50 },
          { memberId: "user-b", amount: 50 },
        ],
      },
      {
        payerId: "user-b",
        amount: 40,
        shares: [
          { memberId: "user-b", amount: 20 },
          { memberId: "user-a", amount: 20 },
        ],
      },
    ];

    const debts = computeNetDebtsFromExpenses({ expenses });

    assert.equal(debts.length, 1);
    assert.deepEqual(debts[0], {
      fromId: "user-b",
      toId: "user-a",
      amount: 30,
    });
  });

  await t.test("applies settlement payments to reduce or eliminate debt", () => {
    const rawDebts = [{ fromId: "user-b", toId: "user-a", amount: 50 }];
    const partialSettlement: SettledPayment[] = [
      { groupId: "group-1", fromId: "user-b", toId: "user-a", amount: 30 },
    ];

    const partialRemaining = applySettlements(rawDebts, "group-1", partialSettlement);
    assert.equal(partialRemaining.length, 1);
    assert.equal(partialRemaining[0].amount, 20);

    const fullSettlement: SettledPayment[] = [
      { groupId: "group-1", fromId: "user-b", toId: "user-a", amount: 50 },
    ];
    const fullySettled = applySettlements(rawDebts, "group-1", fullSettlement);
    assert.equal(fullySettled.length, 0);
  });

  await t.test("computes balance status correctly for the active user", () => {
    const group = { userId: "user-1" };

    // Case 1: active user is owed money
    const owedDebts = [{ fromId: "user-2", toId: "you", amount: 75 }];
    const statusOwed = computeBalanceStatusForUser(group, owedDebts, "USD", "user-1");
    assert.deepEqual(statusOwed, {
      type: "owedToYou",
      amount: 75,
      currency: "USD",
    });

    // Case 2: active user owes money
    const debtToOthers = [{ fromId: "you", toId: "user-2", amount: 40 }];
    const statusYouOwe = computeBalanceStatusForUser(group, debtToOthers, "USD", "user-1");
    assert.deepEqual(statusYouOwe, {
      type: "youOwe",
      amount: 40,
      currency: "USD",
    });

    // Case 3: completely settled
    const statusSettled = computeBalanceStatusForUser(group, [], "USD", "user-1");
    assert.deepEqual(statusSettled, {
      type: "settled",
      amount: 0,
      currency: "USD",
    });
  });
});
