export type BalanceStatus = {
  type: "owedToYou" | "youOwe" | "settled";
  amount: number;
  currency: string;
};

export type DebtEdge = {
  fromId: string;
  toId: string;
  amount: number;
};

export type SettledPayment = {
  id?: string;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
};

export type SplitExpenseShare = {
  memberId: string;
  amount: number;
};

export type SplitExpense = {
  id?: string;
  payerId: string;
  amount: number;
  shares: SplitExpenseShare[];
};

export function computeNetDebtsFromExpenses(group: { expenses: SplitExpense[] }): DebtEdge[] {
  const net = new Map<string, number>();
  const key = (a: string, b: string) => `${a}|${b}`;

  for (const exp of group.expenses) {
    for (const s of exp.shares) {
      if (s.memberId === exp.payerId) continue;
      const k = key(s.memberId, exp.payerId);
      net.set(k, (net.get(k) ?? 0) + s.amount);
      const rev = key(exp.payerId, s.memberId);
      net.set(rev, (net.get(rev) ?? 0) - s.amount);
    }
  }

  const out: DebtEdge[] = [];
  net.forEach((amount, k) => {
    if (amount <= 0) return;
    const [fromId, toId] = k.split("|");
    out.push({ fromId, toId, amount });
  });
  return out;
}

export function applySettlements(
  edges: DebtEdge[],
  groupId: string,
  settled: SettledPayment[]
): DebtEdge[] {
  const byKey = new Map<string, number>();
  for (const e of edges) {
    const k = `${e.fromId}|${e.toId}`;
    byKey.set(k, (byKey.get(k) ?? 0) + e.amount);
  }
  for (const s of settled.filter((x) => x.groupId === groupId)) {
    const k = `${s.fromId}|${s.toId}`;
    const cur = byKey.get(k) ?? 0;
    byKey.set(k, Math.max(0, cur - s.amount));
  }
  const out: DebtEdge[] = [];
  byKey.forEach((amount, k) => {
    if (amount > 0) {
      const [fromId, toId] = k.split("|");
      out.push({ fromId, toId, amount });
    }
  });
  return out;
}

export function computeBalanceStatusForUser(
  group: { userId: string },
  effectiveDebts: DebtEdge[],
  currencyCode: string,
  currentUserId: string
): BalanceStatus {
  let owedToYou = 0;
  let youOwe = 0;
  const activeUserId = group.userId === currentUserId ? "you" : currentUserId;
  for (const e of effectiveDebts) {
    if (e.toId === activeUserId) owedToYou += e.amount;
    if (e.fromId === activeUserId) youOwe += e.amount;
  }
  const net = owedToYou - youOwe;
  if (net > 0)
    return { type: "owedToYou", amount: net, currency: currencyCode };
  if (net < 0)
    return { type: "youOwe", amount: -net, currency: currencyCode };
  return { type: "settled", amount: 0, currency: currencyCode };
}
