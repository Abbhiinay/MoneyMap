import { supabase } from "./supabaseClient";
import { fetchGroupById, joinGroup } from "./groupsDb";

export type DbInvitation = {
  id: string;
  group_id: string;
  invited_email: string;
  inviter_id: string;
  inviter_name: string;
  group_name: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

const LOCAL_INVITES_KEY = "moneymap_local_invitations";

function getLocalInvitations(): DbInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_INVITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalInvitations(invites: DbInvitation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(invites));
  } catch {
    // ignore storage error
  }
}

export async function createGroupInvitations(
  groupId: string,
  groupName: string,
  inviter: { id: string; email?: string; name: string },
  membersInput: string[]
): Promise<void> {
  const inviterEmail = inviter.email?.trim().toLowerCase() || "";
  
  // Filter strictly valid emails that are NOT the inviter's own email
  const validEmails = membersInput
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && e.includes(".") && e !== inviterEmail);

  if (validEmails.length === 0) return;

  const records = validEmails.map((email) => ({
    group_id: groupId,
    invited_email: email,
    inviter_id: inviter.id,
    inviter_name: inviter.name || "A MoneyMap user",
    group_name: groupName,
    status: "pending",
  }));

  try {
    const { error } = await supabase.from("group_invitations").insert(records);
    if (error) {
      console.warn("Supabase group_invitations insert fallback to local storage:", error.message);
      const current = getLocalInvitations();
      const newInvites: DbInvitation[] = records.map((r, i) => ({
        id: `local-inv-${Date.now()}-${i}`,
        ...r,
        status: "pending" as const,
        created_at: new Date().toISOString(),
      }));
      saveLocalInvitations([...newInvites, ...current]);
    }
  } catch (err) {
    console.warn("Failed to insert invitations into Supabase, saving locally:", err);
    const current = getLocalInvitations();
    const newInvites: DbInvitation[] = records.map((r, i) => ({
      id: `local-inv-${Date.now()}-${i}`,
      ...r,
      status: "pending" as const,
      created_at: new Date().toISOString(),
    }));
    saveLocalInvitations([...newInvites, ...current]);
  }
}

export async function fetchPendingInvitationsForEmail(email: string, currentUserId?: string): Promise<DbInvitation[]> {
  if (!email) return [];
  const cleanEmail = email.trim().toLowerCase();

  let dbInvites: DbInvitation[] = [];
  try {
    let query = supabase
      .from("group_invitations")
      .select("*")
      .ilike("invited_email", cleanEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (currentUserId) {
      query = query.neq("inviter_id", currentUserId);
    }

    const { data, error } = await query;
    if (!error && data) {
      dbInvites = data as DbInvitation[];
    }
  } catch (err) {
    console.warn("Could not query group_invitations from Supabase:", err);
  }

  // Combine with local storage invitations (strictly filter out self-invitations)
  const localInvites = getLocalInvitations().filter(
    (inv) =>
      inv.invited_email.toLowerCase() === cleanEmail &&
      inv.status === "pending" &&
      (!currentUserId || inv.inviter_id !== currentUserId)
  );

  const combinedMap = new Map<string, DbInvitation>();
  for (const inv of [...dbInvites, ...localInvites]) {
    combinedMap.set(inv.id, inv);
  }

  return Array.from(combinedMap.values());
}

export async function acceptGroupInvitation(
  invitationId: string,
  user: { id: string; email: string; name: string }
): Promise<boolean> {
  let invite: DbInvitation | null = null;

  // Check Supabase first
  try {
    const { data } = await supabase
      .from("group_invitations")
      .select("*")
      .eq("id", invitationId)
      .maybeSingle();
    if (data) invite = data as DbInvitation;
  } catch {
    // ignore
  }

  if (!invite) {
    const local = getLocalInvitations();
    invite = local.find((i) => i.id === invitationId) ?? null;
  }

  if (!invite) return false;

  // 1. Join group
  const memberName = user.name || user.email.split("@")[0] || "Member";
  await joinGroup(invite.group_id, { id: user.id, name: memberName }, user.email);

  // 2. Update invitation status to accepted
  try {
    await supabase
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);
  } catch {
    // ignore
  }

  // Update local storage if present
  const local = getLocalInvitations();
  const updatedLocal = local.map((i) => (i.id === invitationId ? { ...i, status: "accepted" as const } : i));
  saveLocalInvitations(updatedLocal);

  // Dispatch custom event so group page reloads automatically if active
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("moneymap:group-joined", { detail: { groupId: invite.group_id } }));
  }

  return true;
}

export async function declineGroupInvitation(invitationId: string): Promise<boolean> {
  try {
    await supabase
      .from("group_invitations")
      .update({ status: "declined" })
      .eq("id", invitationId);
  } catch {
    // ignore
  }

  const local = getLocalInvitations();
  const updatedLocal = local.map((i) => (i.id === invitationId ? { ...i, status: "declined" as const } : i));
  saveLocalInvitations(updatedLocal);

  return true;
}
