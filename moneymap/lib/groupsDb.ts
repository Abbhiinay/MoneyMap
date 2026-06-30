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

export type DbGroupSettlement = {
  id: string;
  group_id: string;
  from_id: string;
  to_id: string;
  amount: number;
  created_at: string;
};

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "42P01" ||
    maybeError.message?.toLowerCase().includes("group_settlements") === true
  );
}

export async function fetchGroupsForUser(userId: string): Promise<{
  groups: Array<DbGroup & { expenses: DbGroupExpense[] }>;
  settlements: DbGroupSettlement[];
}> {
  let { data: groupsData, error: groupsError } = await supabase
    .from("groups")
    .select("id, user_id, name, description, members, created_at")
    .or(`user_id.eq.${userId},members.cs.[{"id":"${userId}"}]`)
    .order("created_at", { ascending: false });

  if (groupsError || !groupsData) {
    const res = await supabase
      .from("groups")
      .select("id, user_id, name, description, members, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    groupsData = res.data;
  }
  const rawGroups = (groupsData ?? []) as DbGroup[];

  if (rawGroups.length === 0) {
    return { groups: [], settlements: [] };
  }

  // Deduplicate by group ID and keep unique group names so ghost duplicate rows from earlier don't clutter UI
  const uniqueMap = new Map<string, DbGroup>();
  for (const g of rawGroups) {
    const key = `${g.name.trim().toLowerCase()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, g);
    }
  }
  const groups = Array.from(uniqueMap.values());

  const groupIds = rawGroups.map((g) => g.id);

  const [
    { data: expensesData, error: expensesError },
    { data: settlementsData, error: settlementsError },
  ] = await Promise.all([
    supabase
      .from("group_expenses")
      .select("*")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_settlements")
      .select("*")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
  ]);

  if (expensesError) throw expensesError;
  if (settlementsError && !isMissingRelationError(settlementsError)) {
    throw settlementsError;
  }
  const allExpenses = (expensesData ?? []) as DbGroupExpense[];
  const settlements = settlementsError
    ? []
    : ((settlementsData ?? []) as DbGroupSettlement[]);

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

  return { groups: result, settlements };
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

export async function deleteGroup(groupId: string, groupName?: string): Promise<void> {
  try {
    await supabase.from("group_expenses").delete().eq("group_id", groupId);
    await supabase.from("group_settlements").delete().eq("group_id", groupId);
  } catch {
    // ignore
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;

  // Delete duplicate rows with exact same group name to clean DB completely
  if (groupName) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("groups").delete().eq("user_id", user.id).ilike("name", groupName.trim());
      }
    } catch {
      // ignore
    }
  }
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

export async function addGroupSettlement(
  groupId: string,
  payload: {
    from_id: string;
    to_id: string;
    amount: number;
  }
): Promise<DbGroupSettlement> {
  const { data, error } = await supabase
    .from("group_settlements")
    .insert({
      group_id: groupId,
      from_id: payload.from_id,
      to_id: payload.to_id,
      amount: payload.amount,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DbGroupSettlement;
}

export async function fetchGroupById(groupId: string): Promise<DbGroup | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("id, user_id, name, description, members, created_at")
    .eq("id", groupId)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbGroup;
}

export async function joinGroup(groupId: string, newMember: DbMember): Promise<DbGroup | null> {
  const group = await fetchGroupById(groupId);
  if (!group) return null;
  
  const members = group.members ?? [];
  const exists = members.some(m => m.id === newMember.id || m.name.toLowerCase() === newMember.name.toLowerCase());
  if (!exists) {
    const updatedMembers = [...members, newMember];
    const { data, error } = await supabase
      .from("groups")
      .update({ members: updatedMembers })
      .eq("id", groupId)
      .select("id, user_id, name, description, members, created_at")
      .single();
    if (error) throw error;
    return data as DbGroup;
  }
  return group;
}

