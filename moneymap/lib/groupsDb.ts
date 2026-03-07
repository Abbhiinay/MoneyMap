import { supabase } from "./supabaseClient";

export type DbMember = { id: string; name: string };
export type DbExpenseShare = { memberId: string; amount: number };

export type DbGroup = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  members: DbMember[];
  created_at: string;
};

export type DbGroupExpense = {
  id: string;
  group_id: string;
  payer_id: string;
  category: string;
  label: string;
  amount: number;
  currency: string;
  shares: DbExpenseShare[];
  created_at: string;
};

export async function fetchGroupsForUser(userId: string): Promise<{
  groups: Array<DbGroup & { expenses: DbGroupExpense[] }>;
}> {
  const { data: groupsData, error: groupsError } = await supabase
    .from("groups")
    .select("id, user_id, name, description, members, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (groupsError) throw groupsError;
  const groups = (groupsData ?? []) as DbGroup[];

  if (groups.length === 0) {
    return { groups: [] };
  }

  const { data: expensesData, error: expensesError } = await supabase
    .from("group_expenses")
    .select("*")
    .in("group_id", groups.map((g) => g.id))
    .order("created_at", { ascending: false });

  if (expensesError) throw expensesError;
  const allExpenses = (expensesData ?? []) as DbGroupExpense[];

  const byGroup = new Map<string, DbGroupExpense[]>();
  for (const e of allExpenses) {
    const list = byGroup.get(e.group_id) ?? [];
    list.push(e);
    byGroup.set(e.group_id, list);
  }

  const result = groups.map((g) => ({
    ...g,
    expenses: byGroup.get(g.id) ?? [],
  }));

  return { groups: result };
}

export async function createGroup(
  userId: string,
  payload: {
    name: string;
    description: string;
    members: DbMember[];
  }
): Promise<DbGroup> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      user_id: userId,
      name: payload.name,
      description: payload.description || null,
      members: payload.members,
    })
    .select("id, user_id, name, description, members, created_at")
    .single();

  if (error) throw error;
  return data as DbGroup;
}

export async function updateGroup(
  groupId: string,
  payload: {
    name?: string;
    description?: string;
    members?: DbMember[];
  }
): Promise<void> {
  const { error } = await supabase
    .from("groups")
    .update({
      ...(payload.name != null && { name: payload.name }),
      ...(payload.description != null && { description: payload.description }),
      ...(payload.members != null && { members: payload.members }),
    })
    .eq("id", groupId);

  if (error) throw error;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}

export async function addGroupExpense(
  groupId: string,
  payload: {
    payer_id: string;
    category: string;
    label: string;
    amount: number;
    currency: string;
    shares: DbExpenseShare[];
  }
): Promise<DbGroupExpense> {
  const { data, error } = await supabase
    .from("group_expenses")
    .insert({
      group_id: groupId,
      payer_id: payload.payer_id,
      category: payload.category,
      label: payload.label,
      amount: payload.amount,
      currency: payload.currency,
      shares: payload.shares,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbGroupExpense;
}

export async function deleteGroupExpense(
  groupId: string,
  expenseId: string
): Promise<void> {
  const { error } = await supabase
    .from("group_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("group_id", groupId);

  if (error) throw error;
}
