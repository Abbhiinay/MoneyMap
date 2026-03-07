 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUserCurrency } from "@/lib/useUserCurrency";
import {
  fetchGroupsForUser,
  createGroup as dbCreateGroup,
  updateGroup as dbUpdateGroup,
  deleteGroup as dbDeleteGroup,
  addGroupExpense as dbAddGroupExpense,
  deleteGroupExpense as dbDeleteGroupExpense,
} from "@/lib/groupsDb";
import { supabase } from "@/lib/supabaseClient";

const CURRENT_USER_ID = "you";

type Member = {
  id: string;
  name: string;
};

type BalanceStatus = {
  type: "owedToYou" | "youOwe" | "settled";
  amount: number;
  currency: string;
};

type ExpenseShare = {
  memberId: string;
  amount: number;
};

type Expense = {
  id: string;
  payerId: string;
  category: "Food" | "Travel" | "Hotel" | "Groceries" | "Party" | "Other";
  label: string;
  amount: number;
  currency: string;
  shares: ExpenseShare[];
  createdAt: string;
};

type Group = {
  id: string;
  name: string;
  description?: string;
  members: Member[];
  expenses: Expense[];
  balanceStatus: BalanceStatus;
};

const CATEGORY_ICON: Record<Expense["category"], string> = {
  Food: "🍔",
  Travel: "🚕",
  Hotel: "🏨",
  Groceries: "🛒",
  Party: "🎉",
  Other: "📦",
};

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dbGroupToGroup(
  row: {
    id: string;
    name: string;
    description: string | null;
    members: Member[];
    expenses: Array<{
      id: string;
      payer_id: string;
      category: string;
      label: string;
      amount: number;
      currency: string;
      shares: ExpenseShare[];
      created_at: string;
    }>;
  },
  currencyCode: string
): Group {
  const expenses: Expense[] = (row.expenses ?? []).map((e) => ({
    id: e.id,
    payerId: e.payer_id,
    category: e.category as Expense["category"],
    label: e.label,
    amount: Number(e.amount),
    currency: e.currency,
    shares: e.shares ?? [],
    createdAt: e.created_at,
  }));
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    members: row.members ?? [],
    expenses,
    balanceStatus: { type: "settled", amount: 0, currency: currencyCode },
  };
}

type NewGroupModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (group: {
    name: string;
    description: string;
    members: string[];
    date: string;
  }) => void;
};

type EditGroupModalProps = {
  open: boolean;
  group: Group | null;
  onClose: () => void;
  onSave: (groupId: string, payload: { name: string; description: string; members: Member[] }) => void;
};

type NewExpenseModalProps = {
  open: boolean;
  members: Member[];
  currencyCode: string;
  onClose: () => void;
  onCreate: (expense: {
    payerId: string;
    label: string;
    category: Expense["category"];
    totalAmount: number;
    shares: ExpenseShare[];
  }) => void;
};

type ExpenseFlowDiagramProps = {
  expense: Expense;
  members: Member[];
  currencyCode: string;
};

type ExpenseCardProps = {
  expense: Expense;
  members: Member[];
  expanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  currencyCode: string;
};

type GroupDetailProps = {
  group: Group;
  currencyCode: string;
  settledPayments: SettledPayment[];
  onDeleteExpense: (groupId: string, expenseId: string) => void;
  onAddExpense: (groupId: string, payload: Omit<Expense, "id" | "createdAt">) => void;
  onSettle: (payment: SettledPayment) => void;
};

type GroupCardProps = {
  group: Group;
  selected: boolean;
  onSelect: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  balanceStatus: BalanceStatus;
  currencyCode: string;
};

type DebtEdge = {
  fromId: string;
  toId: string;
  amount: number;
};

type SettledPayment = {
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
};

function computeNetDebtsFromExpenses(group: Group): DebtEdge[] {
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

function applySettlements(
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

function computeBalanceStatusForUser(
  group: Group,
  effectiveDebts: DebtEdge[],
  currencyCode: string
): BalanceStatus {
  let owedToYou = 0;
  let youOwe = 0;
  for (const e of effectiveDebts) {
    if (e.toId === CURRENT_USER_ID) owedToYou += e.amount;
    if (e.fromId === CURRENT_USER_ID) youOwe += e.amount;
  }
  const net = owedToYou - youOwe;
  if (net > 0)
    return { type: "owedToYou", amount: net, currency: currencyCode };
  if (net < 0)
    return { type: "youOwe", amount: -net, currency: currencyCode };
  return { type: "settled", amount: 0, currency: currencyCode };
}

function NewGroupModal({ open, onClose, onCreate }: NewGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (!createdSlug) return null;
    return `moneymap.app/splitmap/${createdSlug}/invite`;
  }, [createdSlug]);

  const handleAddMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (!members.includes(trimmed)) {
      setMembers((prev) => [...prev, trimmed]);
    }
    setMemberInput("");
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      members,
      date,
    };
    onCreate(payload);
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setCreatedSlug(slug || "group");
  };

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setMemberInput("");
    setMembers([]);
    setDate(new Date().toISOString().slice(0, 10));
    setCreatedSlug(null);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-950"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              New group
            </h2>
            <button
              onClick={resetAndClose}
              className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Group name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Goa trip, Roommates, Hackathon..."
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Trip details, household notes, or what this group is for."
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Group members
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Add email or username"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() =>
                          setMembers((prev) => prev.filter((x) => x !== m))
                        }
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Group date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400"
            >
              Create group
            </button>
          </div>

          {inviteLink && (
            <motion.div
              className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900/60"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="font-medium">Shareable invite link</p>
              <p className="mt-1 break-all font-mono text-[10px]">
                {inviteLink}
              </p>
              <p className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-200/80">
                Members joining through this link automatically join the group.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EditGroupModal({ open, group, onClose, onSave }: EditGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (open && group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setMembers(group.members ?? []);
      setMemberInput("");
    }
  }, [open, group]);

  const handleAddMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (!members.some((m) => m.name === trimmed)) {
      setMembers((prev) => [
        ...prev,
        { id: `m-${Date.now()}-${trimmed}`, name: trimmed },
      ]);
    }
    setMemberInput("");
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    if (!group || !name.trim()) return;
    onSave(group.id, { name: name.trim(), description: description.trim(), members });
    onClose();
  };

  if (!open || !group) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-950"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Edit group
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Group name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Members
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Add member (email or name)"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 dark:bg-slate-50 dark:text-slate-900"
                >
                  Add
                </button>
              </div>
              {members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {m.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function NewExpenseModal({
  open,
  members,
  currencyCode,
  onClose,
  onCreate,
}: NewExpenseModalProps) {
  const [payerId, setPayerId] = useState<string>(members[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<Expense["category"]>("Food");
  const [totalAmount, setTotalAmount] = useState("");
  const [autoDivide, setAutoDivide] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    () => members.map((m) => m.id)
  );
  const [manualShares, setManualShares] = useState<Record<string, string>>({});

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const parsedTotal = Number(totalAmount) || 0;

  const computedShares: ExpenseShare[] = useMemo(() => {
    if (parsedTotal <= 0 || selectedMemberIds.length === 0) return [];
    if (autoDivide) {
      const equal = parsedTotal / selectedMemberIds.length;
      return selectedMemberIds.map((id) => ({
        memberId: id,
        amount: Number(equal.toFixed(2)),
      }));
    }
    return selectedMemberIds.map((id) => ({
      memberId: id,
      amount: Number(manualShares[id] || 0),
    }));
  }, [autoDivide, parsedTotal, selectedMemberIds, manualShares]);

  const manualTotal = computedShares.reduce((sum, s) => sum + s.amount, 0);
  const isManualMismatch =
    !autoDivide && parsedTotal > 0 && Math.abs(manualTotal - parsedTotal) > 0.01;

  const handleCreate = () => {
    if (!payerId || !label.trim() || parsedTotal <= 0) return;
    if (computedShares.length === 0) return;
    if (isManualMismatch) return;
    onCreate({
      payerId,
      label: label.trim(),
      category,
      totalAmount: parsedTotal,
      shares: computedShares,
    });
    onClose();
    setLabel("");
    setTotalAmount("");
    setAutoDivide(true);
    setManualShares({});
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-xl rounded-2xl border border-slate-200/80 bg-white p-5 text-sm shadow-xl shadow-slate-900/10 dark:border-slate-800/80 dark:bg-slate-950"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              New expense
            </h2>
            <button
              onClick={onClose}
              className="rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Who pays
                </label>
                <select
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  For what
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Dinner, taxi, hotel, groceries..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                />
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as Expense["category"])
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                >
                  <option value="Food">🍔 Food</option>
                  <option value="Travel">🚕 Travel</option>
                  <option value="Hotel">🏨 Hotel</option>
                  <option value="Groceries">🛒 Groceries</option>
                  <option value="Party">🎉 Party</option>
                  <option value="Other">📦 Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Total amount
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  To whom
                </p>
                <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoDivide}
                    onChange={(e) => setAutoDivide(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-700"
                  />
                  Auto divide equally
                </label>
              </div>

              <div className="mt-1 max-h-40 space-y-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2 dark:bg-slate-900/60">
                {members.map((m) => {
                  const checked = selectedMemberIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                    >
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(m.id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-slate-700"
                        />
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                          {initials(m.name)}
                        </span>
                        <span>{m.name}</span>
                      </label>
                      {!autoDivide && checked && (
                        <input
                          type="number"
                          value={manualShares[m.id] ?? ""}
                          onChange={(e) =>
                            setManualShares((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none ring-0 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {!autoDivide && parsedTotal > 0 && (
                <p
                  className={`mt-1 text-[11px] ${
                    isManualMismatch
                      ? "text-red-500"
                      : "text-emerald-500 dark:text-emerald-400"
                  }`}
                >
                  Manual entries: {formatAmount(manualTotal, currencyCode)} / Total:{" "}
                  {formatAmount(parsedTotal, currencyCode)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isManualMismatch || parsedTotal <= 0}
              className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-slate-50 shadow-sm shadow-slate-900/40 transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-50/30"
            >
              Add expense
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ExpenseFlowDiagram({ expense, members, currencyCode }: ExpenseFlowDiagramProps) {
  const payer = members.find((m) => m.id === expense.payerId);

  const shareWithNames = expense.shares.map((s) => ({
    ...s,
    member: members.find((m) => m.id === s.memberId),
  }));

  return (
    <motion.div
      className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-800"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
              {payer ? initials(payer.name) : "?"}
            </span>
            <span className="text-[10px]">Payer</span>
          </div>

          <motion.div
            className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-white px-3 py-2 text-center shadow-sm shadow-slate-900/5 dark:bg-slate-950"
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
          >
            <div className="text-xs font-medium text-slate-800 dark:text-slate-100">
              {CATEGORY_ICON[expense.category]} {expense.category}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {expense.label}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-900 dark:text-slate-50">
              {formatAmount(expense.amount, currencyCode)}
            </div>
            <motion.div
              className="pointer-events-none absolute inset-x-0 -bottom-2 mx-auto h-0.5 w-10 rounded-full bg-emerald-400/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </motion.div>

          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-slate-950">
              {shareWithNames.length}
            </span>
            <span className="text-[10px]">Members</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {shareWithNames.map((s) => (
          <motion.div
            key={s.memberId}
            className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 shadow-sm shadow-slate-900/5 dark:bg-slate-950"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {s.member ? initials(s.member.name) : "?"}
              </span>
              <div>
                <p className="text-[11px] font-medium">
                  {s.member?.name ?? "Unknown"}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Owes {formatAmount(s.amount, currencyCode)}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-500 dark:text-emerald-400">
              → {payer?.name ?? "Payer"}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ExpenseCard({
  expense,
  members,
  expanded,
  onToggle,
  onDelete,
  currencyCode,
}: ExpenseCardProps) {
  const payer = members.find((m) => m.id === expense.payerId);
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      layout
      className="group relative rounded-xl bg-slate-100/80 px-3 py-2.5 text-xs text-slate-700 shadow-sm shadow-slate-900/5 transition hover:bg-slate-100 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      initial={false}
      whileHover={{ y: -1 }}
    >
      <motion.div layout className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
            {payer ? initials(payer.name) : "?"}
          </span>
          <div>
            <p className="text-xs font-medium text-slate-900 dark:text-slate-50">
              {payer?.name ?? "Unknown"}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {CATEGORY_ICON[expense.category]} {expense.category} ·{" "}
              {expense.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-right text-[11px]">
          <div>
            <p className="font-semibold text-emerald-500 dark:text-emerald-400">
              {formatAmount(expense.amount, currencyCode)}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {new Date(expense.createdAt).toLocaleDateString("default", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onMouseEnter={(e) => e.stopPropagation()}
              onMouseLeave={(e) => e.stopPropagation()}
              className={`rounded-full p-1.5 text-slate-400 transition hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 ${
                hover ? "opacity-100" : "opacity-0"
              }`}
              aria-label="Delete expense"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ExpenseFlowDiagram expense={expense} members={members} currencyCode={currencyCode} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GroupDetail({
  group,
  currencyCode,
  settledPayments,
  onDeleteExpense,
  onAddExpense,
  onSettle,
}: GroupDetailProps) {
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "map">(
    "expenses"
  );
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(
    null
  );
  const [memberHover, setMemberHover] = useState(false);

  const totalGroupAmount = group.expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  const netDebts = useMemo(
    () => computeNetDebtsFromExpenses(group),
    [group.expenses]
  );
  const effectiveDebts = useMemo(
    () => applySettlements(netDebts, group.id, settledPayments),
    [netDebts, group.id, settledPayments]
  );

  const memberSpent = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of group.members) map.set(m.id, 0);
    for (const e of group.expenses) {
      const cur = map.get(e.payerId) ?? 0;
      map.set(e.payerId, cur + e.amount);
    }
    return map;
  }, [group.members, group.expenses]);

  const handleCreateExpense = (payload: {
    payerId: string;
    label: string;
    category: Expense["category"];
    totalAmount: number;
    shares: ExpenseShare[];
  }) => {
    onAddExpense(group.id, {
      payerId: payload.payerId,
      label: payload.label,
      category: payload.category,
      amount: payload.totalAmount,
      currency: currencyCode,
      shares: payload.shares,
    });
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Group detail
          </p>
          <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
            {group.name}
          </h2>
          {group.description && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {group.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="relative flex -space-x-2"
            onMouseEnter={() => setMemberHover(true)}
            onMouseLeave={() => setMemberHover(false)}
          >
            {group.members.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-slate-900 text-[10px] font-medium text-slate-50 dark:border-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                {initials(m.name)}
              </div>
            ))}
            {group.members.length > 4 && (
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-slate-100 text-[10px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                +{group.members.length - 4}
              </div>
            )}
            {memberHover && (
              <div className="absolute left-0 top-full z-10 mt-2 min-w-[140px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <p className="border-b border-slate-100 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Members
                </p>
                {group.members.map((m) => (
                  <p
                    key={m.id}
                    className="px-3 py-1 text-[11px] text-slate-700 dark:text-slate-200"
                  >
                    {m.name}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="hidden border-l border-slate-200 pl-3 text-right text-[11px] dark:border-slate-800 sm:block">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Total group expenses
            </p>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">
              {formatAmount(totalGroupAmount, currencyCode)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewExpenseOpen(true)}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-50 shadow-sm shadow-slate-900/40 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-50/30"
            >
              Add expense
            </button>
            <button
              type="button"
              onClick={() => {
                const youOwe = effectiveDebts.filter((e) => e.fromId === CURRENT_USER_ID);
                if (youOwe.length > 0) {
                  youOwe.forEach((e) =>
                    onSettle({
                      groupId: group.id,
                      fromId: e.fromId,
                      toId: e.toId,
                      amount: e.amount,
                    })
                  );
                }
              }}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
            >
              Settle up
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 border-b border-slate-100 text-[11px] dark:border-slate-800">
        <nav className="-mb-px flex gap-4">
          {[
            { id: "expenses", label: "Expenses" },
            { id: "balances", label: "Balances" },
            { id: "map", label: "Visual map" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setActiveTab(tab.id as "expenses" | "balances" | "map")
                }
                className={`relative pb-2 text-xs font-medium transition ${
                  isActive
                    ? "text-slate-900 dark:text-slate-50"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.span
                    layoutId="splitmap-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-500"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 text-xs">
        {activeTab === "expenses" && (
          <div className="space-y-2">
            {group.expenses.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                No expenses yet. Start by adding the first shared expense for
                this group.
              </p>
            ) : (
              group.expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  members={group.members}
                  expanded={expandedExpenseId === expense.id}
                  onToggle={() =>
                    setExpandedExpenseId((prev) =>
                      prev === expense.id ? null : expense.id
                    )
                  }
                  onDelete={() => onDeleteExpense(group.id, expense.id)}
                  currencyCode={currencyCode}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "balances" && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Total spent per member and who owes whom.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {group.members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
                      {initials(m.name)}
                    </span>
                    <p className="text-[11px] font-medium text-slate-900 dark:text-slate-50">
                      {m.name}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    Spent {formatAmount(memberSpent.get(m.id) ?? 0, currencyCode)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:text-slate-200 dark:ring-slate-800">
              {effectiveDebts.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400">
                  No outstanding balances.
                </p>
              ) : (
                effectiveDebts.map((e) => {
                  const from = group.members.find((m) => m.id === e.fromId);
                  const to = group.members.find((m) => m.id === e.toId);
                  return (
                    <p key={`${e.fromId}-${e.toId}`}>
                      {from?.name ?? e.fromId} owes {to?.name ?? e.toId}{" "}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatAmount(e.amount, currencyCode)}
                      </span>
                    </p>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              SplitMap graph showing who owes whom. Arrows point from debtor to creditor.
            </p>
            <div className="relative overflow-hidden rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-900/70 dark:ring-slate-800">
              {effectiveDebts.length === 0 ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No debts in this group.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-700 dark:text-slate-200">
                  {effectiveDebts.map((e, i) => {
                    const from = group.members.find((m) => m.id === e.fromId);
                    const to = group.members.find((m) => m.id === e.toId);
                    return (
                      <motion.div
                        key={`${e.fromId}-${e.toId}-${i}`}
                        className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-950"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
                          {from ? initials(from.name) : e.fromId.slice(0, 2)}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-slate-950">
                          {to ? initials(to.name) : e.toId.slice(0, 2)}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatAmount(e.amount, currencyCode)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <NewExpenseModal
        open={newExpenseOpen}
        members={group.members}
        currencyCode={currencyCode}
        onClose={() => setNewExpenseOpen(false)}
        onCreate={handleCreateExpense}
      />
    </div>
  );
}

function GroupCard({ group, selected, onSelect, onEdit, onDelete, balanceStatus, currencyCode }: GroupCardProps) {
  const [hover, setHover] = useState(false);
  const memberCount = group.members.length;
  const expenseCount = group.expenses.length || 0;

  const balanceLabel =
    balanceStatus.type === "owedToYou"
      ? "You're owed"
      : balanceStatus.type === "youOwe"
      ? "You owe"
      : "Settled";

  const balanceColor =
    balanceStatus.type === "owedToYou"
      ? "text-emerald-500"
      : balanceStatus.type === "youOwe"
      ? "text-red-500"
      : "text-slate-400";

  const amountLabel = formatAmount(
    balanceStatus.amount,
    currencyCode
  );

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -1 }}
      className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl px-3 py-2.5 text-left text-xs shadow-sm shadow-slate-900/5 transition-colors ${
        selected
          ? "bg-slate-900 text-slate-50 ring-1 ring-slate-900/70 dark:bg-slate-50 dark:text-slate-900"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center justify-between text-left"
      >
        <div>
          <p
            className={`font-medium ${
              selected
                ? "text-slate-50 dark:text-slate-900"
                : "text-slate-900 dark:text-slate-50"
            }`}
          >
            {group.name}
          </p>
          <p
            className={`mt-0.5 text-[11px] ${
              selected
                ? "text-slate-200/80 dark:text-slate-700"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {memberCount} member{memberCount === 1 ? "" : "s"} · {expenseCount}{" "}
            shared expense{expenseCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right text-[11px]">
          <p className={`font-semibold ${balanceColor}`}>{balanceLabel}</p>
          <p
            className={
              selected
                ? "text-slate-50 dark:text-slate-900"
                : "text-slate-900 dark:text-slate-100"
            }
          >
            {balanceStatus.type === "youOwe" ? `-${amountLabel}` : amountLabel}
          </p>
        </div>
      </button>
      <div
        className="absolute right-0 top-0 flex h-full items-center gap-1 pr-2 transition-transform duration-250 ease-out"
        style={{
          transform: hover ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(e);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Edit group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-red-100 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          aria-label="Delete group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

type SettlementSuggestionsPanelProps = {
  groups: Group[];
  settledPayments: SettledPayment[];
  currencyCode: string;
  onSettle: (payment: SettledPayment) => void;
};

function SettlementSuggestionsPanel({
  groups,
  settledPayments,
  currencyCode,
  onSettle,
}: SettlementSuggestionsPanelProps) {
  const suggestions = useMemo(() => {
    const out: Array<{
      groupId: string;
      groupName: string;
      fromId: string;
      toId: string;
      fromName: string;
      toName: string;
      amount: number;
      settled: boolean;
    }> = [];
    for (const g of groups) {
      const net = computeNetDebtsFromExpenses(g);
      const effective = applySettlements(net, g.id, settledPayments);
      for (const e of effective) {
        if (e.fromId !== CURRENT_USER_ID && e.toId !== CURRENT_USER_ID) continue;
        const from = g.members.find((m) => m.id === e.fromId);
        const to = g.members.find((m) => m.id === e.toId);
        out.push({
          groupId: g.id,
          groupName: g.name,
          fromId: e.fromId,
          toId: e.toId,
          fromName: from?.name ?? e.fromId,
          toName: to?.name ?? e.toId,
          amount: e.amount,
          settled: false,
        });
      }
      for (const s of settledPayments.filter((x) => x.groupId === g.id)) {
        if (s.fromId !== CURRENT_USER_ID && s.toId !== CURRENT_USER_ID) continue;
        const from = g.members.find((m) => m.id === s.fromId);
        const to = g.members.find((m) => m.id === s.toId);
        out.push({
          groupId: g.id,
          groupName: g.name,
          fromId: s.fromId,
          toId: s.toId,
          fromName: from?.name ?? s.fromId,
          toName: to?.name ?? s.toId,
          amount: s.amount,
          settled: true,
        });
      }
    }
    return out;
  }, [groups, settledPayments]);

  const totalToPay = useMemo(
    () =>
      suggestions
        .filter((s) => s.fromId === CURRENT_USER_ID && !s.settled)
        .reduce((sum, s) => sum + s.amount, 0),
    [suggestions]
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Settlement suggestions
        </p>
        {totalToPay > 0 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            | Total to pay:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {formatAmount(totalToPay, currencyCode)}
            </span>
          </p>
        )}
      </div>
      <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
        {suggestions.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            No settlements needed.
          </p>
        ) : (
          suggestions.map((s, i) => (
            <div
              key={s.settled ? `settled-${s.groupId}-${s.fromId}-${s.toId}-${i}` : `${s.groupId}-${s.fromId}-${s.toId}`}
              className="flex items-start justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 transition-colors dark:bg-slate-900/80"
            >
              <div>
                <p>
                  <span className="font-medium">{s.fromName}</span>{" "}
                  <span className="text-slate-500">pays</span>{" "}
                  <span className="font-medium">{s.toName}</span>{" "}
                  <span className="font-semibold">
                    {formatAmount(s.amount, currencyCode)}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {s.settled ? "Settled for" : "to settle"} {s.groupName}.
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-500 dark:text-emerald-400">
                  {s.fromName} → {s.toName} {formatAmount(s.amount, currencyCode)}
                </p>
              </div>
              {s.settled ? (
                <span className="mt-0.5 rounded-full bg-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                  Settled
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onSettle({
                      groupId: s.groupId,
                      fromId: s.fromId,
                      toId: s.toId,
                      amount: s.amount,
                    })
                  }
                  className="mt-0.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400"
                >
                  Settle
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

type QuickAddExpenseCardProps = {
  groups: Group[];
  onQuickAdd: (groupId: string, amount: number, description: string) => void;
};

function QuickAddExpenseCard({
  groups,
  onQuickAdd,
}: QuickAddExpenseCardProps) {
  const [amount, setAmount] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    const g = groups.find((x) => x.id === groupId);
    const num = Number(amount);
    if (!g || !Number.isFinite(num) || num <= 0) return;
    const share = num / g.members.length;
    onQuickAdd(groupId, num, description.trim() || "Quick expense");
    setAmount("");
    setDescription("");
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
        Quick add expense
      </p>
      <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-2">
        <input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        >
          <option value="">Choose group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!groupId || !amount}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-50 shadow-sm shadow-slate-900/40 hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:shadow-slate-50/30"
        >
          Add to group
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Add a shared expense to any group in a couple of taps.
      </p>
    </div>
  );
}

export default function GroupsPage() {
  const { currency: currencyCode } = useUserCurrency();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);
  const [settledPayments, setSettledPayments] = useState<SettledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) {
        if (mounted) {
          setLoading(false);
          setGroups([]);
        }
        return;
      }
      try {
        const { groups: rows } = await fetchGroupsForUser(user.id);
        if (!mounted) return;
        setGroups(
          rows.map((r) =>
            dbGroupToGroup(
              {
                ...r,
                expenses: r.expenses ?? [],
              },
              currencyCode
            )
          )
        );
        if (rows.length > 0 && !selectedGroupId) {
          setSelectedGroupId(rows[0].id);
        }
      } catch (err) {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Failed to load groups");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [currencyCode]);

  const handleCreateGroup = useCallback(
    async (payload: {
      name: string;
      description: string;
      members: string[];
      date: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const members: Member[] = [
        { id: CURRENT_USER_ID, name: "You" },
        ...payload.members.map((m, idx) => ({
          id: `m-${idx}-${m.replace(/\s/g, "")}`,
          name: m,
        })),
      ];
      const created = await dbCreateGroup(user.id, {
        name: payload.name,
        description: payload.description,
        members,
      });
      const newGroup = dbGroupToGroup(
        { ...created, expenses: [] },
        currencyCode
      );
      setGroups((prev) => [newGroup, ...prev]);
      setSelectedGroupId(newGroup.id);
    },
    [currencyCode]
  );

  const handleUpdateGroup = useCallback(
    async (groupId: string, payload: { name: string; description: string; members: Member[] }) => {
      await dbUpdateGroup(groupId, payload);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, name: payload.name, description: payload.description, members: payload.members }
            : g
        )
      );
      setEditGroup(null);
    },
    []
  );

  const handleDeleteGroup = useCallback(async (group: Group) => {
    await dbDeleteGroup(group.id);
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    if (selectedGroupId === group.id) setSelectedGroupId(null);
    setDeleteConfirmGroup(null);
  }, [selectedGroupId]);

  const handleAddExpense = useCallback(
    async (groupId: string, payload: Omit<Expense, "id" | "createdAt">) => {
      const created = await dbAddGroupExpense(groupId, {
        payer_id: payload.payerId,
        category: payload.category,
        label: payload.label,
        amount: payload.amount,
        currency: payload.currency,
        shares: payload.shares,
      });
      const expense: Expense = {
        id: created.id,
        payerId: created.payer_id,
        category: created.category as Expense["category"],
        label: created.label,
        amount: Number(created.amount),
        currency: created.currency,
        shares: created.shares ?? [],
        createdAt: created.created_at,
      };
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, expenses: [...g.expenses, expense] } : g
        )
      );
    },
    []
  );

  const handleDeleteExpense = useCallback(async (groupId: string, expenseId: string) => {
    await dbDeleteGroupExpense(groupId, expenseId);
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }
          : g
      )
    );
  }, []);

  const handleSettle = useCallback((payment: SettledPayment) => {
    setSettledPayments((prev) => [...prev, payment]);
  }, []);

  const handleQuickAdd = useCallback(
    (groupId: string, amount: number, description: string) => {
      const g = groups.find((x) => x.id === groupId);
      if (!g || g.members.length === 0) return;
      const share = amount / g.members.length;
      handleAddExpense(groupId, {
        payerId: CURRENT_USER_ID,
        category: "Other",
        label: description,
        amount,
        currency: currencyCode,
        shares: g.members.map((m) => ({
          memberId: m.id,
          amount: Number(share.toFixed(2)),
        })),
      });
    },
    [groups, currencyCode, handleAddExpense]
  );

  const groupBalanceStatus = useCallback(
    (group: Group): BalanceStatus => {
      const net = computeNetDebtsFromExpenses(group);
      const effective = applySettlements(net, group.id, settledPayments);
      return computeBalanceStatusForUser(group, effective, currencyCode);
    },
    [settledPayments, currencyCode]
  );

  return (
    <div className="space-y-6 text-slate-900 transition-colors dark:text-slate-100">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
          SplitMap Groups
        </h1>
        <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Keep every shared expense fair, transparent, and easy to settle across
          trips, households, and projects.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-colors dark:border-slate-800/80 dark:bg-slate-950/80">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Active groups
            </p>
            <button
              type="button"
              onClick={() => setNewGroupOpen(true)}
              className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 transition hover:bg-emerald-400"
            >
              New group
            </button>
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
            {loading ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Loading groups...
              </p>
            ) : loadError ? (
              <p className="text-[11px] text-red-500 dark:text-red-400">
                {loadError}
              </p>
            ) : groups.length === 0 ? (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                No groups yet. Create one with New group.
              </p>
            ) : (
              groups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  selected={group.id === selectedGroupId}
                  onSelect={() => setSelectedGroupId(group.id)}
                  onEdit={() => setEditGroup(group)}
                  onDelete={() => setDeleteConfirmGroup(group)}
                  balanceStatus={groupBalanceStatus(group)}
                  currencyCode={currencyCode}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <QuickAddExpenseCard groups={groups} onQuickAdd={handleQuickAdd} />
          <SettlementSuggestionsPanel
            groups={groups}
            settledPayments={settledPayments}
            currencyCode={currencyCode}
            onSettle={handleSettle}
          />
        </div>
      </div>

      {selectedGroup && (
        <GroupDetail
          group={selectedGroup}
          currencyCode={currencyCode}
          settledPayments={settledPayments}
          onDeleteExpense={handleDeleteExpense}
          onAddExpense={handleAddExpense}
          onSettle={handleSettle}
        />
      )}

      <NewGroupModal
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreate={handleCreateGroup}
      />

      <EditGroupModal
        open={!!editGroup}
        group={editGroup}
        onClose={() => setEditGroup(null)}
        onSave={handleUpdateGroup}
      />

      {deleteConfirmGroup && (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl dark:border-slate-800/80 dark:bg-slate-950"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Are you sure you want to delete this group?
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This action cannot be undone. All associated expenses will be removed.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmGroup(null)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteGroup(deleteConfirmGroup)}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}


