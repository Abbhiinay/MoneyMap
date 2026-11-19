export function filterValidInvitationEmails(membersInput: string[], inviterEmail?: string): string[] {
  const cleanInviter = (inviterEmail || "").trim().toLowerCase();
  return membersInput
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@") && e.includes(".") && e !== cleanInviter);
}
